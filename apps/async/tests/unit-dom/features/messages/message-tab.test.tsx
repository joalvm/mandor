import { ItemTab, collectionStore, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { originName, shellStore, TabProvider } from '@mandor/shell';
import { byPart } from '@mandor/ui/testing';
import { cleanup, render, screen } from '@testing-library/react';
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

let unregister: () => void = () => undefined;
let resource = '';

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

    unregister();
    unregister = () => undefined;
    messagesStore.getState().reset();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

function readsBack(channel: string) {
    return vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            kind: MESSAGE_ITEM_KIND,
            name: 'Pedido creado',
            channel,
            payload: '{ "id": "{{pedidoId}}" }',
            payloadType: 'json',
        }),
    );
}

describe('the tab of a message', () => {
    it('names the channel the message goes out on, on the card the body rests on', async () => {
        readsBack('pedidos.creado');

        render(
            <TabProvider value={{ resource: resource, tabId: resource }}>
                <ItemTab />
            </TabProvider>,
            { wrapper: AppProviders },
        );
        await flush();

        expect(screen.getByText('pedidos.creado')).toBeInTheDocument();
        expect(byPart('card')).toContainElement(screen.getByText('pedidos.creado'));
    });

    /** Two views of one item are one file: reading it twice would be two answers about one truth. */
    it('reads the item once when the same one is open in two groups', async () => {
        const readItem = readsBack('pedidos.creado');

        render(
            <>
                <TabProvider value={{ resource: resource, tabId: resource }}>
                    <ItemTab />
                </TabProvider>
                <TabProvider value={{ resource: resource, tabId: resource }}>
                    <ItemTab />
                </TabProvider>
            </>,
            { wrapper: AppProviders },
        );
        await flush();

        expect(readItem).toHaveBeenCalledTimes(1);
    });
});
