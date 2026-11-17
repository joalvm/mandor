import type { CollectionNode } from './collection-node.js';

/**
 * Every item in the tree, by path and in the order it is shown. Collections and folders are
 * walked and left out: what a link, a search or a session can point at is an item, never the
 * group holding it.
 */
export function collectionItemPaths(nodes: readonly CollectionNode[]): string[] {
    return nodes.flatMap(itemPathsOf);
}

/** An item gives itself; a collection or a folder gives the items it holds. */
function itemPathsOf(node: CollectionNode): string[] {
    if (node.kind === 'item') {
        return [node.path];
    }

    return collectionItemPaths(node.children);
}
