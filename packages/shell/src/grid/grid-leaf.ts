import { leavesOf, type GridLeaf, type GridNode } from '@mandor/ipc';

export function leafOf(grid: GridNode, groupId: string): GridLeaf | undefined {
    return leavesOf(grid).find((leaf) => leaf.id === groupId);
}

/** A group that left the window cannot be the one the window is showing on its own. */
export function stillOpen(grid: GridNode, groupId: string | null): string | null {
    return groupId !== null && leafOf(grid, groupId) !== undefined ? groupId : null;
}

export function groupOfTab(grid: GridNode, tabId: string): GridLeaf | undefined {
    return leavesOf(grid).find((leaf) => leaf.tabs.some((tab) => tab.id === tabId));
}

/**
 * Rewrites one group and hands back the rest of the tree by reference, so a change in one
 * strip of tabs does not make every other group look new to whoever is subscribed to it.
 */
export function mapLeaf(
    node: GridNode,
    groupId: string,
    change: (leaf: GridLeaf) => GridLeaf,
): GridNode {
    if (node.kind === 'leaf') {
        return node.id === groupId ? change(node) : node;
    }

    return { ...node, children: node.children.map((child) => mapLeaf(child, groupId, change)) };
}
