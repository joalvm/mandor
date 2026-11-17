import type { GridAxis, GridNode } from '@mandor/ipc';

/** A child of a branch with the share of the axis it takes, before its parent is rebuilt. */
type Share = { node: GridNode; size: number };

/**
 * Collapses a branch into its parent when the two split along the same axis.
 *
 * Our tree lets any branch pick its axis, because splitting a group twice in a row nests. A
 * view that alternates axes by depth would draw that nesting sideways, so the two shapes are
 * made to agree here rather than everywhere a split happens: a row inside a row is the same
 * arrangement as one row with more children, and the sizes divide up to say so.
 */
export function flattenedGrid(node: GridNode): GridNode {
    if (node.kind === 'leaf') {
        return node;
    }

    const shares = node.children.flatMap((child, index) =>
        absorbed(flattenedGrid(child), node.sizes[index] ?? 0, node.axis),
    );

    return {
        ...node,
        sizes: shares.map((share) => share.size),
        children: shares.map((share) => share.node),
    };
}

function absorbed(node: GridNode, size: number, axis: GridAxis): Share[] {
    if (node.kind !== 'branch' || node.axis !== axis) {
        return [{ node, size }];
    }

    const total = node.sizes.reduce((sum, each) => sum + each, 0);

    return node.children.map((child, index) => ({
        node: child,
        size: (size * (node.sizes[index] ?? 0)) / total,
    }));
}
