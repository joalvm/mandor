import { createCollectionGroup, type NewCollectionGroup } from './create-collection-group.js';

/**
 * What the caller chose before the collection existed: the id it is filed under, which main
 * draws or an import already read, and the name a person reads.
 */
export type NewCollection = NewCollectionGroup;

/**
 * Makes an empty collection at the first level and answers with the path it took, which is its
 * id. The name lives in the file and the root order is where the top level says which
 * collections it holds and in what arrangement.
 */
export function createCollection(
    root: string,
    workspaceId: string,
    collection: NewCollection,
): Promise<string> {
    return createCollectionGroup(root, workspaceId, '', collection);
}
