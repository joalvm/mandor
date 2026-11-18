import { leavesOf, type GridNode } from '@mandor/ipc';

const FIRST = 1;

/**
 * A tab id for one more view of a doc. It is not the resource: the same file is meant to be open
 * in both halves of the window at once, and two tabs sharing an id would be one tab the grid
 * cannot tell apart.
 *
 * Ids outlive the window —the session file keeps them— so the lowest free number is taken and a
 * long afternoon of opening and closing does not run them away. The prefix keeps the numbering of
 * each kind to itself, so the editor of a file and its preview never collide.
 */
export function nextDocTabId(grid: GridNode, prefix = 'doc'): string {
    const taken = new Set(leavesOf(grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.id)));
    let index = FIRST;

    while (taken.has(`${prefix}-${String(index)}`)) {
        index += 1;
    }

    return `${prefix}-${String(index)}`;
}
