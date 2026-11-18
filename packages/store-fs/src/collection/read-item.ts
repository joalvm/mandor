import { type CollectionItem, parseCollectionItem } from '@mandor/schema';

import { readOrThrow } from '../disk/read-or-throw.js';
import { itemFile } from './collection-path.js';

/**
 * One item, body included. This is the read that opening an item does; listing the tree does
 * not, because a thousand bodies in memory is what the tree exists to avoid.
 */
export async function readItem(
    root: string,
    workspaceId: string,
    path: string,
): Promise<CollectionItem> {
    const read = await readOrThrow(itemFile(root, workspaceId, path), parseCollectionItem);

    return read.value;
}
