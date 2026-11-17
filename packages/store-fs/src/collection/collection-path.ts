import { join } from 'node:path';

import { segmentsOf } from '@mandor/schema';

import { workspaceDir } from '../workspace/workspace-path.js';

const COLLECTION_DIR = 'collections';

/** The extension of every file the collection reads, its three reserved names included. */
export const COLLECTION_EXTENSION = '.yaml';

/** The root envelope: the order of the top level and where the collection was imported from. */
export const COLLECTIONS_FILE = 'collections.yaml';

/** The file of one collection: the order of its children, its auth and its description. */
export const COLLECTION_DEFINITION_FILE = 'collection.yaml';

/** The file of a folder: its visible name and the order of its children. */
export const FOLDER_FILE = 'folder.yaml';

/** Where the reusable work of a workspace lives. Folders are directories, items are files. */
export function collectionDir(root: string, workspaceId: string): string {
    return join(workspaceDir(root, workspaceId), COLLECTION_DIR);
}

export function collectionsFile(root: string, workspaceId: string): string {
    return join(collectionDir(root, workspaceId), COLLECTIONS_FILE);
}

/** The directory of one folder. `segmentsOf` is the path-traversal gate: it runs before `join`. */
export function folderDir(root: string, workspaceId: string, path: string): string {
    return join(collectionDir(root, workspaceId), ...segmentsOf(path));
}

export function folderFile(root: string, workspaceId: string, path: string): string {
    return join(folderDir(root, workspaceId, path), FOLDER_FILE);
}

/** The file of one collection, which lives at the first level of the collection directory. */
export function collectionDefinitionFile(root: string, workspaceId: string, path: string): string {
    return join(folderDir(root, workspaceId, path), COLLECTION_DEFINITION_FILE);
}

/** The file of one item. Its path carries no extension: the path is the identity, not the file. */
export function itemFile(root: string, workspaceId: string, path: string): string {
    return `${folderDir(root, workspaceId, path)}${COLLECTION_EXTENSION}`;
}
