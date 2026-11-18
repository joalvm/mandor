import type { CollectionNode } from '@mandor/schema';
import type { TreeLine } from '@mandor/ui';

/** A line of the places a request can go: a collection or a folder, never an item. */
export type FolderLine = TreeLine & { kind: 'collection' | 'folder'; name: string };

/**
 * The collections and the folders of a workspace, flattened in the order they stand, with what a
 * folded one holds left out. A place with no folder inside does not fold: it has nothing to hide.
 */
export function folderLines(
    nodes: readonly CollectionNode[],
    folded: ReadonlySet<string>,
    level = 1,
): FolderLine[] {
    return nodes.flatMap((node) => {
        if (node.kind === 'item') {
            return [];
        }

        const holdsFolders = node.children.some((child) => child.kind !== 'item');
        const expanded = holdsFolders ? !folded.has(node.path) : undefined;
        const line: FolderLine = {
            expanded,
            id: node.path,
            kind: node.kind,
            level,
            name: node.name,
        };

        if (expanded !== true) {
            return [line];
        }

        return [line, ...folderLines(node.children, folded, level + 1)];
    });
}
