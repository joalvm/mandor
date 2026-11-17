import { failure, success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { renameCollectionNode } from '../../src/lib/rename-collection-node.js';

import { TWO_FOLDERS } from '../support/two-folders.js';

const WORKSPACE = 'events';

const [COLLECTION] = TWO_FOLDERS as [CollectionNode & { kind: 'collection' }];
const [ITEM] = COLLECTION.children as [CollectionNode];

const RENAMED: CollectionNode[] = [{ ...COLLECTION, name: 'Órdenes' }, ...TWO_FOLDERS.slice(1)];

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(TWO_FOLDERS);
});

afterEach(() => {
    collectionStore.getState().reset();
});

describe('renaming a node of the collection', () => {
    it('sends a group through the folder channel and draws the tree read again', async () => {
        const renameFolder = vi
            .spyOn(bridge.collections, 'renameFolder')
            .mockResolvedValue(success({}));
        const renameItem = vi.spyOn(bridge.collections, 'renameItem');

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(RENAMED));

        await renameCollectionNode(WORKSPACE, COLLECTION, 'Órdenes');

        expect(renameFolder).toHaveBeenCalledWith({
            workspaceId: WORKSPACE,
            path: 'pedidos',
            name: 'Órdenes',
        });
        expect(renameItem).not.toHaveBeenCalled();
        expect(collectionStore.getState().nodes).toEqual(RENAMED);
    });

    it('sends an item through the item channel, under the path it keeps', async () => {
        const renameItem = vi
            .spyOn(bridge.collections, 'renameItem')
            .mockResolvedValue(success({}));
        const renameFolder = vi.spyOn(bridge.collections, 'renameFolder');

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));

        await renameCollectionNode(WORKSPACE, ITEM, 'Pedido nuevo');

        expect(renameItem).toHaveBeenCalledWith({
            workspaceId: WORKSPACE,
            path: 'pedidos/pedido-creado',
            name: 'Pedido nuevo',
        });
        expect(renameFolder).not.toHaveBeenCalled();
    });

    it('says what refused it, and reads nothing again', async () => {
        vi.spyOn(bridge.collections, 'renameItem').mockResolvedValue(failure('fs-write', 'denied'));

        const tree = vi.spyOn(bridge.collections, 'tree');

        await renameCollectionNode(WORKSPACE, ITEM, 'Otro');

        expect(collectionStore.getState().error).toBe('fs-write');
        expect(tree).not.toHaveBeenCalled();
        expect(collectionStore.getState().nodes).toEqual(TWO_FOLDERS);
    });
});
