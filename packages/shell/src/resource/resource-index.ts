import { leavesOf, type GridNode } from '@mandor/ipc';

/** The tabs looking at one resource, in the order the grid reads, and whether it is still there. */
type ResourceEntry = { missing: boolean; tabs: string[] };

export type ResourceIndex = Record<string, ResourceEntry>;

/**
 * Kept beside the tree and not inside it. Two tabs on one file share an entry, which is what
 * lets whatever that file costs to hold —a buffer, an editor model, a response— be held once
 * and survive a tab being moved between groups.
 *
 * It is rebuilt from the tree on every change, so no action can forget to keep it up to date.
 * What the tree does not know —that the file is gone from disk— is carried over from the index
 * being replaced, and dropped with the last tab that was looking at it.
 */
export function resourceIndexOf(grid: GridNode, before: ResourceIndex = {}): ResourceIndex {
    const index: ResourceIndex = {};

    for (const leaf of leavesOf(grid)) {
        for (const tab of leaf.tabs) {
            index[tab.resource] = {
                missing: before[tab.resource]?.missing ?? false,
                tabs: [...(index[tab.resource]?.tabs ?? []), tab.id],
            };
        }
    }

    return index;
}
