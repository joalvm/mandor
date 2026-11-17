import { ItemTab, collectionStore, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { createEnvironment, MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { originName, shellStore, TabProvider } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    messagesStore,
    MessageItemKind,
} from '../../../../src/renderer/features/messages/index.js';
import type {
    OutboundFrame,
    OutboundTarget,
} from '../../../../src/renderer/outbound/outbound-port.js';
import { registerOutboundPort } from '../../../../src/renderer/outbound/outbound-registry.js';
import { AppProviders } from '../../support/app-providers.js';
import { flush } from '../../support/flush.js';

const PEDIDO: CollectionNode = {
    kind: 'item',
    itemKind: MESSAGE_ITEM_KIND,
    name: 'Pedido creado',
    path: 'pedido-creado',
    tags: [],
};

const sent: { frame: OutboundFrame; targetId: string }[] = [];

let offItem: () => void = () => undefined;
let offPort: () => void = () => undefined;
let resource = '';
let targets: OutboundTarget[] = [];

function target(id: string, name: string, live: boolean, environmentId = 'local'): OutboundTarget {
    return { environmentId, id, live, name };
}

async function show(): Promise<void> {
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            kind: MESSAGE_ITEM_KIND,
            name: 'Pedido creado',
            payload: '{ "id": "{{pedidoId}}" }',
            payloadType: 'json',
        }),
    );
    render(
        <TabProvider value={{ resource: resource, tabId: resource }}>
            <ItemTab />
        </TabProvider>,
        { wrapper: AppProviders },
    );
    await flush();
}

function clickSend(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

beforeEach(() => {
    vi.restoreAllMocks();
    sent.length = 0;
    targets = [];
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([PEDIDO]);
    messagesStore.getState().reset();
    envStore.getState().reset();
    envStore.setState({
        activeEnvironmentIds: { events: 'local' },
        environments: [
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [{ name: 'pedidoId', value: 'p-1', enabled: true, secret: false }],
            }),
            createEnvironment({ id: 'staging', name: 'Staging' }),
        ],
    });
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    resource = itemResource(originName(), 'events', 'pedido-creado');
    offItem = render(<MessageItemKind />).unmount;
    offPort = registerOutboundPort({
        send: (targetId, frame) => {
            sent.push({ frame, targetId });

            return Promise.resolve();
        },
        subscribe: () => () => undefined,
        targets: () => targets,
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    offPort();
    offItem();
    messagesStore.getState().reset();
    collectionStore.getState().reset();
    envStore.getState().reset();
    shellStore.getState().reset();
});

describe('sending a message of the collection', () => {
    /** One socket up is not a choice: asking which one would be a question with one answer. */
    it('goes through the only live connection without asking', async () => {
        targets = [target('alpha', 'Gateway', true), target('beta', 'Billing', false)];

        await show();
        clickSend();

        expect(sent).toEqual([
            {
                frame: {
                    origin: 'Pedido creado',
                    itemPath: 'pedido-creado',
                    template: '{ "id": "{{pedidoId}}" }',
                },
                targetId: 'alpha',
            },
        ]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('asks which live connection to use when there is more than one', async () => {
        targets = [target('alpha', 'Gateway', true), target('beta', 'Billing', true)];

        await show();
        clickSend();

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(sent).toEqual([]);

        fireEvent.click(screen.getByRole('button', { name: 'Billing' }));

        expect(sent.at(0)?.targetId).toBe('beta');
    });

    /** Nothing is live, so the choice is which connection to open: the send follows it. */
    it('offers the connections of the workspace when none is live', async () => {
        targets = [target('alpha', 'Gateway', false), target('beta', 'Billing', false)];

        await show();
        clickSend();

        expect(screen.getByRole('button', { name: 'Gateway' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Billing' }));

        expect(sent.at(0)?.targetId).toBe('beta');
    });

    /** Not a form: what the environment of the connection does not declare goes out as written. */
    it('sends at once what the environment of the connection does not declare', async () => {
        targets = [target('alpha', 'Gateway', true, 'staging')];

        await show();
        clickSend();

        await waitFor(() => {
            expect(sent.at(0)?.targetId).toBe('alpha');
        });

        expect(screen.queryByText('Variables are missing')).toBeNull();
    });

    /** The window never resolves: what leaves it is the template, and main reads the values. */
    it('hands over the payload with its templates untouched', async () => {
        targets = [target('alpha', 'Gateway', true)];

        await show();
        clickSend();

        expect(sent.at(0)?.frame.template).toBe('{ "id": "{{pedidoId}}" }');
    });
});
