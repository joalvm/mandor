import type { GridLeaf, GridNode } from './grid-node.js';

/** Every group of a grid, left to right, which is the order the tabs of a session read in. */
export function leavesOf(node: GridNode): GridLeaf[] {
    if (node.kind === 'leaf') {
        return [node];
    }

    return node.children.flatMap(leavesOf);
}
