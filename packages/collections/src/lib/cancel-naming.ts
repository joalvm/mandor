import type { CollectionNode } from '@mandor/schema';

import { collectionStore } from '../collection-store.js';

import { removeCollectionNodes } from './remove-collection-nodes.js';

/**
 * Escape on the name field of a row. The field of a collection or a folder made a moment ago
 * takes the making back: nobody named it, nothing went into it, so it was asked for by mistake
 * and goes as it came. Any other field only closes, and the row keeps the name it had.
 */
export async function cancelNaming(workspaceId: string, node: CollectionNode): Promise<void> {
    const store = collectionStore.getState();
    const untouched = store.justMade && (node.kind === 'item' || node.children.length === 0);

    store.setRenaming(null);

    if (untouched) {
        await removeCollectionNodes(workspaceId, [node]);
    }
}
