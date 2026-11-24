import {
    listedRows,
    namedRowsOf,
    variablesOverGlobals,
    type FormatDocument,
    type FormatFile,
    type WorkspaceCollectionSource,
    type WorkspaceData,
} from '@mandor/interop-core';

import { authDocumentOf } from './auth-document.js';
import { FOLDER_FILE, levelFilesOf } from './folder-files.js';
import type { SavedMessages } from './saved-messages.js';
import { scriptBlocksOf } from './script-blocks.js';
import { ENVIRONMENTS_DIR, environmentFilesOf, variableDocumentsOf } from './variable-documents.js';
import { websocketFilesOf } from './websocket-files.js';

const COLLECTION_FILE = 'opencollection';
const SPEC_VERSION = '1.0.0';

/**
 * What the collection asks of every request: its headers, the auth of the collection, or of the
 * workspace when it has none, its variables over the globals of the origin, and its scripts. Bruno has no place
 * for the last two above the collection, so each collection carries them.
 */
function defaultsOf(
    collection: WorkspaceCollectionSource,
    workspace: Pick<WorkspaceData, 'auth' | 'globals'>,
): FormatDocument {
    const auth = collection.settings.auth ?? workspace.auth;
    const document = auth === undefined ? undefined : authDocumentOf(auth);
    // Bruno has no globals in a collection: they go at its lowest level, the collection's own.
    const variables = variableDocumentsOf(
        variablesOverGlobals(collection.settings.variables, workspace.globals),
    );
    const defaults = {
        ...listedRows('headers', namedRowsOf(collection.settings.headers)),
        ...(document === undefined ? {} : { auth: document }),
        ...(variables.length === 0 ? {} : { variables }),
        ...listedRows('scripts', scriptBlocksOf(collection.settings.scripts)),
    };

    return Object.keys(defaults).length === 0 ? {} : { request: defaults };
}

/**
 * One collection of the workspace as the files of a collection of Bruno in OpenCollection:
 * `opencollection.yml` with what it is called and what it asks of every request, a directory
 * for each folder, a file for each request, and `environments/`. The paths are relative to the
 * root of the collection. The WebSocket connections of the workspace are files beside the
 * requests, with the messages `saved` gives them.
 */
export function collectionFilesOf(
    collection: WorkspaceCollectionSource,
    workspace: Pick<WorkspaceData, 'auth' | 'connections' | 'environments' | 'globals'>,
    saved: SavedMessages = new Map(),
): FormatFile[] {
    const taken = [COLLECTION_FILE, ENVIRONMENTS_DIR, FOLDER_FILE];
    const { folders, items, settings } = collection;
    const children = levelFilesOf(collection, { path: '', taken });
    const requestCount = items.filter((item) => item.kind === 'request').length;

    return [
        {
            path: `${COLLECTION_FILE}.yml`,
            document: {
                opencollection: SPEC_VERSION,
                info: { name: collection.name },
                ...(settings.description === undefined ? {} : { docs: settings.description }),
                ...defaultsOf(collection, workspace),
            },
        },
        ...children,
        ...websocketFilesOf(workspace.connections, {
            directory: { path: '', taken },
            first: folders.length + requestCount + 1,
            inherited: workspace.auth,
            saved,
        }),
        ...environmentFilesOf(workspace.environments),
    ];
}
