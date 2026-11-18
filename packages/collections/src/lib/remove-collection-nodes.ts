import type { CollectionNode } from '@mandor/schema';

import { bridge, settlePendingWrites } from '@mandor/shell';
import { collectionStore } from '../collection-store.js';

import { blankItemTabs } from './blank-item-tabs.js';
import { loadCollection } from './load-collection.js';

/**
 * Takes nodes and everything under them out of the workspace, and blanks whatever showed them.
 * One after another, because each is a write of its own on disk; the first refusal stops the
 * rest, and the tree is read again either way, so it shows exactly what went and what stayed.
 */
export async function removeCollectionNodes(
    workspaceId: string,
    nodes: readonly CollectionNode[],
): Promise<void> {
    // What a tab of a folder typed reaches its file before the folder goes.
    await settlePendingWrites();

    for (const node of nodes) {
        const result = await bridge.collections.delete({ workspaceId, path: node.path });

        if (!result.ok) {
            collectionStore.getState().setError(result.error.code);

            break;
        }

        blankItemTabs(workspaceId, node);
    }

    await loadCollection(workspaceId);
}
