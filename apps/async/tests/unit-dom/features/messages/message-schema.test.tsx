import { ItemTab, collectionStore, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { originName, shellStore, TabProvider } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    messagesStore,
    MessageItemKind,
} from '../../../../src/renderer/features/messages/index.js';
import { AppProviders } from '../../support/app-providers.js';
import { flush } from '../../support/flush.js';

const PEDIDO: CollectionNode = {
    kind: 'item',
    itemKind: MESSAGE_ITEM_KIND,
    name: 'Pedido creado',
    path: 'pedido-creado',
    tags: [],
};

/** Longer than the pause the writer waits for, so the timer has certainly gone off. */
const AFTER_THE_PAUSE = 2000;

let unregister: () => void = () => undefined;
let resource = '';

function spyOnWrite() {
    return vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
}

async function show(): Promise<void> {
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            kind: MESSAGE_ITEM_KIND,
            name: 'Pedido creado',
            payload: '{"id": 1}',
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

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([PEDIDO]);
    messagesStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    resource = itemResource(originName(), 'events', 'pedido-creado');
    unregister = render(<MessageItemKind />).unmount;
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.useRealTimers();
    unregister();
    unregister = () => undefined;
    messagesStore.getState().reset();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the schema of a message', () => {
    /** Generating is one press with nothing created beforehand: the body is what it reads. */
    it('writes the schema generated from the body once the pause is over', async () => {
        vi.useFakeTimers();

        const write = spyOnWrite();

        await show();
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Schema' }));
        fireEvent.click(screen.getByRole('button', { name: 'Generate from body' }));

        expect(write).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);
        });

        const last = write.mock.calls.at(-1)?.[0];

        expect(last?.fields).toMatchObject({ kind: MESSAGE_ITEM_KIND, name: 'Pedido creado' });
        expect(String(last?.fields['schema'])).toContain('"properties"');
        expect(String(last?.fields['schema'])).toContain('"type": "number"');
    });

    /** The schema is a tab of its own, and the body it asks for is generated from there. */
    it('generates a body from the schema of the message, asking when the body departs', async () => {
        vi.useFakeTimers();

        const write = spyOnWrite();

        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                kind: MESSAGE_ITEM_KIND,
                name: 'Pedido creado',
                payload: '{"id": "siete"}',
                payloadType: 'json',
                schema: '{"type":"object","properties":{"id":{"type":"number"}}}',
            }),
        );
        render(
            <TabProvider value={{ resource: resource, tabId: resource }}>
                <ItemTab />
            </TabProvider>,
            { wrapper: AppProviders },
        );
        await flush();

        fireEvent.click(screen.getByRole('button', { name: 'Generate from schema' }));

        expect(write).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);
        });

        const last = write.mock.calls.at(-1)?.[0];

        expect(String(last?.fields['payload'])).toContain('"id"');
        expect(String(last?.fields['payload'])).not.toContain('siete');
    });

    /** A body that cannot be read generates nothing: the syntax linter is already speaking. */
    it('leaves the schema alone when the body is not json a parser can read', async () => {
        vi.useFakeTimers();

        const write = spyOnWrite();

        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                kind: MESSAGE_ITEM_KIND,
                name: 'Pedido creado',
                payload: '{"id": {{pedidoId}}}',
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

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Schema' }));
        fireEvent.click(screen.getByRole('button', { name: 'Generate from body' }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);
        });

        expect(write).not.toHaveBeenCalled();
    });

    it('marks the Schema tab with a dot while the payload breaks a rule of it', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                kind: MESSAGE_ITEM_KIND,
                name: 'Pedido creado',
                payload: '{"id": 1}',
                payloadType: 'json',
                schema: '{"properties": {"id": {"type": "string"}}}',
            }),
        );
        render(
            <TabProvider value={{ resource: resource, tabId: resource }}>
                <ItemTab />
            </TabProvider>,
            { wrapper: AppProviders },
        );
        await flush();

        const tab = screen.getByRole('tab', { name: 'Schema' });

        expect(tab).toHaveAttribute('data-broken');
        expect(tab.querySelector('[data-part="tabs-broken"]')).not.toBeNull();
    });
});
