import { collectionItemPaths, type CollectionNode } from '@mandor/schema';
import { isGroup } from './group-nodes.js';

/**
 * Every item a node covers, itself included when it is one. Renaming and deleting a folder
 * reach every tab under it, and a folder has no resource of its own to move or to blank.
 */
export function itemPathsUnder(node: CollectionNode): string[] {
    return collectionItemPaths(isGroup(node) ? node.children : [node]);
}

/** Every group at or under a node — the node itself when it is one — parents first. */
export function groupPathsUnder(node: CollectionNode): string[] {
    if (!isGroup(node)) {
        return [];
    }

    return [node.path, ...node.children.flatMap(groupPathsUnder)];
}
