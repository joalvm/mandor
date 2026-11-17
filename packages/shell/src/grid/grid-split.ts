import type { GridAxis, GridLeaf, GridNode } from '@mandor/ipc';

const EVEN_SHARE = 50;

/**
 * Splitting nests: the group keeps its tabs and gains an empty neighbour beside it. Nothing
 * moves on its own, because the user split to put something somewhere, not to shuffle.
 */
export function splitLeaf(
    node: GridNode,
    groupId: string,
    axis: GridAxis,
    newGroupId: string,
): GridNode {
    if (node.kind === 'leaf') {
        return node.id === groupId ? branchOf(node, axis, newGroupId) : node;
    }

    return {
        ...node,
        children: node.children.map((child) => splitLeaf(child, groupId, axis, newGroupId)),
    };
}

function branchOf(leaf: GridLeaf, axis: GridAxis, newGroupId: string): GridNode {
    return {
        kind: 'branch',
        axis,
        sizes: [EVEN_SHARE, EVEN_SHARE],
        children: [leaf, { kind: 'leaf', id: newGroupId, tabs: [], activeTab: null }],
    };
}
