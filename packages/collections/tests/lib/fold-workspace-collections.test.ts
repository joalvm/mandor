import type { CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { foldWorkspaceCollections } from '../../src/lib/fold-workspace-collections.js';

const TREE: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Pedidos',
        path: 'pedidos',
        children: [{ kind: 'folder', name: 'Pagos', path: 'pedidos/pagos', children: [] }],
    },
];

beforeEach(() => {
    collectionStore.getState().setNodes(TREE);
});

afterEach(() => {
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('folding the tree of the open workspace', () => {
    it('closes every line of the workspace that is open', () => {
        shellStore.setState({ activeWorkspaceId: 'events' });

        foldWorkspaceCollections();

        expect(collectionStore.getState().folded['events']).toEqual(['pedidos', 'pedidos/pagos']);
    });

    it('closes nothing while no workspace is open', () => {
        shellStore.setState({ activeWorkspaceId: null });

        foldWorkspaceCollections();

        expect(collectionStore.getState().folded).toEqual({});
    });
});
