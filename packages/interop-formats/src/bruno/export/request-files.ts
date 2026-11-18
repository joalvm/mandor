import { claimStem, type FormatFile } from '@mandor/interop-core';
import type { CollectionItem } from '@mandor/schema';

import { requestDocumentOf } from './request-document.js';

/** The directory the files go to: its path from the root of the collection, and the names taken. */
export type Directory = { path: string; taken: string[] };

/**
 * One file per request, named after it and numbered from `first`, the way Bruno lists them.
 * `first` is where the first stands among what the directory holds. The other kinds have no place
 * in Bruno.
 */
export function requestFilesOf(
    items: readonly CollectionItem[],
    directory: Directory,
    first: number,
): FormatFile[] {
    const prefix = directory.path === '' ? '' : `${directory.path}/`;

    return items
        .filter((item) => item.kind === 'request')
        .map((item, index) => ({
            path: `${prefix}${claimStem(item.name, directory.taken, 'request')}.yml`,
            document: requestDocumentOf(item, first + index),
        }));
}
