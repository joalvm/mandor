import { leavesOf, type GridNode } from '@mandor/ipc';

/** The root is named; every other group is numbered from here. */
const FIRST_SPLIT = 2;

/**
 * Group ids outlive the window: they are written to the session file. A new group takes the
 * lowest free number so that splitting and closing all afternoon does not run them away.
 */
export function nextGroupId(grid: GridNode): string {
    const taken = new Set(leavesOf(grid).map((leaf) => leaf.id));
    let index = FIRST_SPLIT;

    while (taken.has(`group-${String(index)}`)) {
        index += 1;
    }

    return `group-${String(index)}`;
}
