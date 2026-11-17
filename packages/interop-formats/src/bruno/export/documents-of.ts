import {
    claimStem,
    collectionsToWrite,
    type FormatFile,
    type WorkspaceData,
} from '@mandor/interop-core';

import { savedMessagesOf } from './saved-messages.js';
import { collectionFilesOf } from './workspace-to-opencollection.js';

/**
 * The workspace as the files Bruno takes: the collection at the root of what is saved, or, when
 * there are several, each in a directory named after it. Every collection carries the
 * environments and the variables of the workspace; the connections are in the first one only,
 * since they belong to the workspace and not to a collection.
 */
export function documentsOf(data: WorkspaceData): FormatFile[] {
    const collections = collectionsToWrite(data);
    const stems: string[] = [];
    const saved = savedMessagesOf(data);

    return collections.flatMap((collection, index) => {
        const files = collectionFilesOf(
            collection,
            index === 0 ? data : { ...data, connections: [] },
            saved,
        );

        if (collections.length === 1) {
            return files;
        }

        const stem = claimStem(collection.name, stems, 'collection');

        return files.map((file) => ({ ...file, path: `${stem}/${file.path}` }));
    });
}
