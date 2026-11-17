import {
    claimStem,
    collectionsToWrite,
    type FormatFile,
    type WorkspaceData,
} from '@mandor/interop-core';

import { collectionDocumentOf } from './workspace-to-v5.js';

/**
 * The workspace as the files Insomnia takes: one collection per collection, each in a file
 * named after it. Every file carries the environments of the workspace; the connections are in
 * the first one only, since they belong to the workspace and not to a collection.
 */
export function documentsOf(data: WorkspaceData): FormatFile[] {
    const stems: string[] = [];

    return collectionsToWrite(data).map((collection, index) => {
        const stem = claimStem(collection.name, stems, 'collection');

        return {
            path: `${stem}.insomnia.yaml`,
            document: collectionDocumentOf(
                collection,
                index === 0 ? data : { ...data, connections: [] },
            ),
        };
    });
}
