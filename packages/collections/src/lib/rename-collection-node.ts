import type { CollectionNode } from '@mandor/schema';

import { bridge, settlePendingWrites } from '@mandor/shell';
import { collectionStore } from '../collection-store.js';

import { loadCollection } from './load-collection.js';
import { isGroup } from './group-nodes.js';

/**
 * Renames a node and answers nothing: the path is an id that stays, so no tab has to follow it,
 * and the tree is read again from disk rather than patched here. Which channel it goes through
 * is decided by what the row already knows it is, never by main looking on disk to find out.
 */
export async function renameCollectionNode(
    workspaceId: string,
    node: CollectionNode,
    name: string,
): Promise<void> {
    const request = { workspaceId, path: node.path, name };

    // What a tab of the folder typed reaches the file before the file changes under it.
    await settlePendingWrites();

    const result = isGroup(node)
        ? await bridge.collections.renameFolder(request)
        : await bridge.collections.renameItem(request);

    if (!result.ok) {
        collectionStore.getState().setError(result.error.code);

        return;
    }

    await loadCollection(workspaceId);
}
