import { leavesOf, type GridNode } from '@mandor/ipc';

/** A tab of the grid, and the group it is sitting in. */
export type DocTabAt = { groupId: string; tabId: string };

/**
 * Where a resource is already open as a tab of one kind, or `null`. The kind is asked for and
 * not guessed: a doc and the page of that doc name the same file, and a reader who asks for the
 * document again means the editor they left, not the preview sitting beside it.
 */
export function docTabIn(grid: GridNode, resource: string, kind: string): DocTabAt | null {
    for (const leaf of leavesOf(grid)) {
        const found = leaf.tabs.find((tab) => tab.kind === kind && tab.resource === resource);

        if (found !== undefined) {
            return { groupId: leaf.id, tabId: found.id };
        }
    }

    return null;
}
