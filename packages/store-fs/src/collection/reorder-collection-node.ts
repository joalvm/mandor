import type { CollectionPlacement } from './collection-placement.js';
import { readOrder, writeOrder } from './collection-order.js';
import { orderPlacing } from './ordered-names.js';

/**
 * Arranges the siblings of one folder and touches nothing else. The order of a folder lives in
 * its own file, so a reorder is one write and its diff names one file: that is the whole point
 * of keeping the order there instead of inside every node.
 */
export async function reorderCollectionNode(
    root: string,
    workspaceId: string,
    parent: string,
    placement: CollectionPlacement,
): Promise<void> {
    const order = await readOrder(root, workspaceId, parent);

    await writeOrder(root, workspaceId, parent, orderPlacing(order, placement));
}
