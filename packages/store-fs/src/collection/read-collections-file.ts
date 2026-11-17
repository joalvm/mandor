import { type CollectionsFile, parseCollectionsFile } from '@mandor/schema';

import { readDocument } from '../disk/read-document.js';
import { collectionsFile } from './collection-path.js';

/**
 * The root envelope of a collection. A file that is missing or that nobody can read answers with an
 * empty order: the tree is on disk, and losing the arrangement must never lose the work.
 */
export async function readCollectionsFile(
    root: string,
    workspaceId: string,
): Promise<CollectionsFile> {
    const read = await readDocument(collectionsFile(root, workspaceId), parseCollectionsFile);

    return read.ok ? read.value : { order: [], origin: undefined };
}
