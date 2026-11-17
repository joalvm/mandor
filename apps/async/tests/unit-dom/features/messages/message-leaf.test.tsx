import { MessageIcon } from '@mandor/icons';
import { CollectionSidebar, collectionStore, itemLeaf } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { selectGroupOfTab, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageItemKind } from '../../../../src/renderer/features/messages/index.js';
import { AppProviders } from '../../support/app-providers.js';

function message(path: string, name: string): CollectionNode {
    return { kind: 'item', itemKind: MESSAGE_ITEM_KIND, name, path, tags: [] };
}

const TWO_MESSAGES: CollectionNode[] = [
    message('pedido-creado', 'Pedido creado'),
    message('pedido-pagado', 'Pedido pagado'),
];

let unregister: () => void = () => undefined;

beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window.mandor.collections, 'tree').mockResolvedValue(success(TWO_MESSAGES));
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(TWO_MESSAGES);
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    unregister = render(<MessageItemKind />).unmount;
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    unregister();
    unregister = () => undefined;
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the message leaf in the collection', () => {
    it('draws one row per message of the workspace', async () => {
        render(<CollectionSidebar />, { wrapper: AppProviders });

        expect(await screen.findByRole('treeitem', { name: 'Pedido creado' })).toBeInTheDocument();
        expect(screen.getByRole('treeitem', { name: 'Pedido pagado' })).toBeInTheDocument();
    });

    /** The icon is the registry's answer: the row only asks the leaf what a message looks like. */
    it('gives the message kind an icon of its own', () => {
        expect(itemLeaf(MESSAGE_ITEM_KIND)?.component).toBe(MessageIcon);
    });

    it('opens a tab of the item when the row is picked', async () => {
        render(<CollectionSidebar />, { wrapper: AppProviders });

        fireEvent.click(await screen.findByRole('treeitem', { name: 'Pedido creado' }));

        expect(selectGroupOfTab(shellStore.getState(), 'item-events-pedido-creado')).not.toBeNull();
    });
});
