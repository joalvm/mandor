import { leavesOf, type GridNode } from '@mandor/ipc';

/**
 * The group next door to the one with the focus: the next one along, and the first again once
 * the last is reached.
 *
 * A window with a single group has no next door, which is what the answer of nothing means.
 * Opening beside then makes the room first, because that is what opening beside is for: put
 * this where the other thing is not.
 */
export function groupBeside(grid: GridNode, activeGroupId: string): string | null {
    const groups = leavesOf(grid);
    const beside = groups[groups.findIndex((leaf) => leaf.id === activeGroupId) + 1] ?? groups[0];

    if (groups.length < 2 || beside === undefined) {
        return null;
    }

    return beside.id;
}
