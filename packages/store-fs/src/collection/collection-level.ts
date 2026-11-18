import { segmentsOf } from '@mandor/schema';

import { collectionDefinitionFile, collectionsFile, folderFile } from './collection-path.js';

/**
 * What a path of the tree names: a collection at the first level, a folder anywhere below. The
 * two keep the same settings under a different file name, and this is the one place that tells
 * which: nobody else looks at the depth of a path.
 */
export type CollectionLevel = 'collection' | 'folder';

/**
 * Where the children of a parent are listed. The top level has no path of its own and keeps its
 * order in the root file; every other parent keeps it in the file of its level.
 */
export type HolderLevel = 'root' | CollectionLevel;

type GroupFile = (root: string, workspaceId: string, path: string) => string;

const LEVEL_FILES: Record<CollectionLevel, GroupFile> = {
    collection: collectionDefinitionFile,
    folder: folderFile,
};

/** The level of a group path. Collections sit at the first level; every deeper group is a folder. */
export function levelOf(path: string): CollectionLevel {
    return segmentsOf(path).length === 1 ? 'collection' : 'folder';
}

/** The level that lists the children of `parent`: the root for the empty parent. */
export function holderOf(parent: string): HolderLevel {
    return parent === '' ? 'root' : levelOf(parent);
}

/** The file a group of `level` keeps at `path`, whatever level the path itself has. */
export function fileOfLevel(
    level: CollectionLevel,
    root: string,
    workspaceId: string,
    path: string,
): string {
    return LEVEL_FILES[level](root, workspaceId, path);
}

/** The file that describes one group: `collection.yaml` or `folder.yaml`, by its level. */
export function levelFile(root: string, workspaceId: string, path: string): string {
    return fileOfLevel(levelOf(path), root, workspaceId, path);
}

/** The file that holds the order of what hangs from `parent`. */
export function orderFile(root: string, workspaceId: string, parent: string): string {
    if (holderOf(parent) === 'root') {
        return collectionsFile(root, workspaceId);
    }

    return levelFile(root, workspaceId, parent);
}
