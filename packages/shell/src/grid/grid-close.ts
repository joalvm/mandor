import type { GridBranch, GridNode } from '@mandor/ipc';

/** What a child keeps when the branch it lives in loses a sibling and has to be rebuilt. */
type Sized = { node: GridNode; size: number };

const EVEN_SHARE = 50;

/**
 * Takes a group out of the grid. Its sibling takes the space it had, and when only one child
 * is left the split itself goes with it. The root has no sibling to hand anything to, so it
 * stays where it is and empties instead: a window with no group at all could show nothing.
 */
export function withoutLeaf(node: GridNode, groupId: string): GridNode {
    if (node.kind === 'leaf') {
        return node.id === groupId ? { ...node, tabs: [], activeTab: null } : node;
    }

    if (node.children.some((child) => isGroup(child, groupId))) {
        return pruned(node, groupId);
    }

    return { ...node, children: node.children.map((child) => withoutLeaf(child, groupId)) };
}

function pruned(branch: GridBranch, groupId: string): GridNode {
    const kept = branch.children.flatMap<Sized>((child, index) =>
        isGroup(child, groupId) ? [] : [{ node: child, size: branch.sizes[index] ?? EVEN_SHARE }],
    );
    const only = kept[0];

    if (kept.length === 1 && only !== undefined) {
        return only.node;
    }

    return {
        ...branch,
        children: kept.map((item) => item.node),
        sizes: kept.map((item) => item.size),
    };
}

function isGroup(node: GridNode, groupId: string): boolean {
    return node.kind === 'leaf' && node.id === groupId;
}
