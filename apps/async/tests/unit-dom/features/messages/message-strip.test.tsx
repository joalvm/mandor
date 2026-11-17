import { ItemTab, collectionStore, itemResource } from '@mandor/collections';
import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { originName, selectSection, shellStore, TabProvider } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, act, fireEvent, render, screen } from '@testing-library/react';
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

/** The strip opens on the payload, and draws the description once it is read. */
async function writePayload(text: string): Promise<void> {
    (await editorAt(0)).typeOver(text);
}

function type(name: string, value: string): void {
    const field = screen.getByRole('textbox', { name });

    field.textContent = value;
    fireEvent.input(field);
}

function fieldsOfLastWrite(write: ReturnType<typeof spyOnWrite>): Record<string, unknown> {
    const last = write.mock.calls.at(-1)?.[0];

    return last?.fields ?? {};
}

function spyOnWrite() {
    return vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
}

async function show(): Promise<void> {
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            kind: MESSAGE_ITEM_KIND,
            name: 'Pedido creado',
            channel: 'pedidos.creado',
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

describe('the strip of a message', () => {
    /** Reading what the message is for must not cost the payload that was half written. */
    it('keeps the payload mounted while the description is read', async () => {
        await show();
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Description' }));

        // An event with nothing written about it offers to write it, on its page.
        expect(screen.getByRole('button', { name: 'Write' })).toBeVisible();
        // The section nobody is reading is hidden, not gone: it keeps its editor and its undo.
        expect(
            screen.getByRole('group', { hidden: true, name: 'Message editor' }),
        ).toBeInTheDocument();
    });

    it('writes the payload once the typing stops, with the templates unresolved', async () => {
        vi.useFakeTimers();

        const write = spyOnWrite();

        await show();
        await writePayload('{ "id": "{{otroId}}" }');

        expect(write).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);
        });

        expect(fieldsOfLastWrite(write)['payload']).toBe('{ "id": "{{otroId}}" }');
    });

    /** An edited event is no longer a look: the next click on the collection opens beside it. */
    it('keeps the tab that was only open to look at the event', async () => {
        spyOnWrite();
        shellStore
            .getState()
            .openTab(ROOT_GROUP_ID, { id: resource, kind: 'item', resource }, { preview: true });

        await show();
        type('Channel', 'pedidos.pagado');

        expect(JSON.stringify(shellStore.getState().grid)).not.toContain('preview');
    });

    /** A field somebody emptied is gone, and the write has to say so or the old value survives. */
    it('takes the channel off the item when it is emptied', async () => {
        vi.useFakeTimers();

        const write = spyOnWrite();

        await show();
        type('Channel', '');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);
        });

        const fields = fieldsOfLastWrite(write);

        expect('channel' in fields).toBe(true);
        expect(fields['channel']).toBeUndefined();
    });

    /** The window remembers the section beside the resource, so both views of an item agree. */
    it('leaves the section the reader moved to on the resource', async () => {
        await show();
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Description' }));

        expect(selectSection(shellStore.getState(), resource)).toBe('description');
    });

    /** Nothing is dirty here: what is on the screen is on its way to the file already. */
    it('asks nothing on the way out of a tab with recent changes', async () => {
        vi.useFakeTimers();
        spyOnWrite();

        await show();
        await writePayload('{ "id": 1 }');

        const { unmount } = render(<span />, { wrapper: AppProviders });

        unmount();

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
});
