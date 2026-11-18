import type { CollectionNode } from '@mandor/schema';
import { isGroup } from './group-nodes.js';

/**
 * The node a path names, or nothing. A tab opened before its tree landed asks for a path the
 * store has never seen, and that answer is «not yet», never a throw.
 */
export function nodeAt(nodes: readonly CollectionNode[], path: string): CollectionNode | null {
    for (const node of nodes) {
        if (node.path === path) {
            return node;
        }

        if (isGroup(node) && path.startsWith(`${node.path}/`)) {
            return nodeAt(node.children, path);
        }
    }

    return null;
}

/** What a group holds, or nothing when the path names a leaf or no node at all. */
export function childrenAt(nodes: readonly CollectionNode[], path: string): CollectionNode[] {
    const node = nodeAt(nodes, path);

    return node !== null && isGroup(node) ? node.children : [];
}
