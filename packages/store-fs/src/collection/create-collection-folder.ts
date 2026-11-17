import { createCollectionGroup, type NewCollectionGroup } from './create-collection-group.js';

/**
 * What the caller chose before the folder existed: the id it is filed under, which main draws
 * or an import already read, and the name a person reads.
 */
export type NewCollectionFolder = NewCollectionGroup;

/**
 * Makes an empty folder and answers with the path it took. The first level holds collections
 * alone: a folder made there is a collection, and the level of its path says so.
 */
export function createCollectionFolder(
    root: string,
    workspaceId: string,
    parent: string,
    folder: NewCollectionFolder,
): Promise<string> {
    return createCollectionGroup(root, workspaceId, parent, folder);
}
