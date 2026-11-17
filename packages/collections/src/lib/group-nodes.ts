import type { CollectionFolderNode, CollectionNode, CollectionSetNode } from '@mandor/schema';

/**
 * The nodes that hold others: a collection at the first level and a folder inside one. The row,
 * the drag and the walk treat both the same way until something says otherwise.
 */
export function isGroup(node: CollectionNode): node is CollectionSetNode | CollectionFolderNode {
    return node.kind !== 'item';
}

/** The path of every node that holds others, at every depth: what folding all of it folds. */
export function groupPaths(nodes: readonly CollectionNode[]): string[] {
    return nodes.flatMap((node) =>
        isGroup(node) ? [node.path, ...groupPaths(node.children)] : [],
    );
}

/** The path of every item that holds examples, at every depth: the other lines that open. */
export function exampleItemPaths(nodes: readonly CollectionNode[]): string[] {
    return nodes.flatMap((node) => {
        if (isGroup(node)) {
            return exampleItemPaths(node.children);
        }

        return node.examples === undefined ? [] : [node.path];
    });
}
