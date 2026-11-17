import { CollectionSidebar, collectionStore, itemLeaf } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { SendIcon } from '@mandor/icons';
import { shellStore } from '@mandor/shell';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestItemKind } from '../../../../src/renderer/features/requests/RequestItemKind.js';
import { AppProviders } from '../../support/app-providers.js';

function request(path: string, name: string, mark?: string): CollectionNode {
    return { itemKind: REQUEST_ITEM_KIND, kind: 'item', mark, name, path, tags: [] };
}

const REQUESTS: CollectionNode[] = [
    request('crear-pedido', 'crear pedido', 'POST'),
    request('listar-pedidos', 'listar pedidos'),
];

describe('the request leaf in the collection', () => {
    let unregister: () => void;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(window.mandor.collections, 'tree').mockResolvedValue(success(REQUESTS));
        collectionStore.getState().reset();
        collectionStore.getState().setNodes(REQUESTS);
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
        unregister = render(<RequestItemKind />, { wrapper: AppProviders }).unmount;
    });

    afterEach(() => {
        // The window goes first: resetting a store under a mounted tree is an update outside act.
        cleanup();

        unregister();
        collectionStore.getState().reset();
        shellStore.getState().reset();
    });

    it('draws one row per request of the workspace', async () => {
        render(<CollectionSidebar />, { wrapper: AppProviders });

        expect(await screen.findByRole('treeitem', { name: 'crear pedido' })).toBeInTheDocument();
        expect(screen.getByRole('treeitem', { name: 'listar pedidos' })).toBeInTheDocument();
    });

    /** A request never opened says what its file says; one with no method goes out as GET. */
    it('wears the method of each request where the glyph would stand', async () => {
        render(<CollectionSidebar />, { wrapper: AppProviders });

        expect(await screen.findByText('POST')).toHaveAttribute('data-method', 'POST');
        expect(screen.getByText('GET')).toHaveAttribute('data-method', 'GET');
    });

    /** The icon is the registry's answer: the row only asks the leaf what a request looks like. */
    it('gives the request kind an icon of its own', () => {
        expect(itemLeaf(REQUEST_ITEM_KIND)?.component).toBe(SendIcon);
        expect(itemLeaf(REQUEST_ITEM_KIND)?.newLabel).toBe('requests:newRequest');
    });
});
