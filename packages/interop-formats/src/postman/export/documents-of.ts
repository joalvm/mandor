import { claimStem, type FormatFile, type WorkspaceData } from '@mandor/interop-core';

import { environmentFileOf } from './environment-file.js';
import { globalsFileOf } from './globals-file.js';
import { collectionDocumentOf } from './workspace-to-collection.js';

/** The file of globals Postman writes for the globals of the origin, when it has any. */
function globalsOf(data: WorkspaceData): FormatFile[] {
    if (data.globals.length === 0) {
        return [];
    }

    return [{ path: 'workspace.postman_globals.json', document: globalsFileOf(data.globals) }];
}

/**
 * The workspace as the files Postman takes: one collection per collection and one environment
 * per environment, each in a file named after it with the extension Postman writes, and the
 * variables of the workspace as its globals.
 */
export function documentsOf(data: WorkspaceData): FormatFile[] {
    const collectionStems: string[] = [];
    const environmentStems: string[] = [];

    return [
        ...data.collections.map((collection) => ({
            path: `${claimStem(collection.name, collectionStems, 'collection')}.postman_collection.json`,
            document: collectionDocumentOf(collection, data),
        })),
        ...data.environments.map((environment) => ({
            path: `${claimStem(environment.name, environmentStems, 'environment')}.postman_environment.json`,
            document: environmentFileOf(environment),
        })),
        ...globalsOf(data),
    ];
}
