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

async function show(schema: string, payload = '{"id": 1}'): Promise<void> {
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            kind: MESSAGE_ITEM_KIND,
            name: 'Pedido creado',
            payload,
            payloadType: 'json',
            ...(schema === '' ? {} : { schema }),
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
        environments: [createEnvironment({ id: 'local', name: 'Local' })],
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
    targets = [target('alpha', 'Gateway', true)];
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

describe('sending a message that carries a schema', () => {
    /** Sending something that breaks its schema on purpose is a legitimate test: nothing asks. */
    it('sends a payload that does not meet the schema without asking', async () => {
        await show('{"type": "object", "properties": {"id": {"type": "number"}}}', '{"id": "uno"}');

        clickSend();

        await waitFor(() => {
            expect(sent).toHaveLength(1);
        });

        // Main is who checks the frame resolved; the schema travels so it can.
        expect(sent[0]?.frame.schema).toContain('"type": "number"');
    });

    it('sends without asking when the payload meets the schema', async () => {
        await show('{"type": "object", "properties": {"id": {"type": "number"}}}');

        clickSend();

        expect(sent).toHaveLength(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    /** No schema, no question: the send is nobody's to refuse. */
    it('sends without asking when the message carries no schema', async () => {
        await show('');

        clickSend();

        expect(sent).toHaveLength(1);
        expect(sent[0]?.frame.schema).toBeUndefined();
    });
});
