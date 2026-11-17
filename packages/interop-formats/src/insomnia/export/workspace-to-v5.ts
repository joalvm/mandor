import {
    childrenInOrder,
    variablesOverGlobals,
    type FormatDocument,
    type WorkspaceCollectionSource,
    type WorkspaceData,
    type WorkspaceFolderNode,
} from '@mandor/interop-core';
import { inheritedHeaders } from '@mandor/schema';

import { environmentsDocumentOf } from './environment-document.js';
import { folderDocumentsOf } from './folder-documents.js';
import { insomniaIdOf } from './insomnia-id.js';
import { requestDocumentOf } from './request-document.js';
import { websocketDocumentOf } from './websocket-document.js';

const FILE_TYPE = 'collection.insomnia.rest/5.0';
const SCHEMA_VERSION = '5.1';

/** A folder of the first level, sending the lines of the collection, which has no place for them. */
function withHeadersOf(
    collection: WorkspaceCollectionSource,
    folder: WorkspaceFolderNode,
): WorkspaceFolderNode {
    const headers = inheritedHeaders([collection], folder.settings.headers).sent;

    return { ...folder, settings: { ...folder.settings, headers } };
}

/**
 * One collection of the workspace as a collection of Insomnia 5: a tree of folders and requests
 * under `collection`. Insomnia has no file for the workspace and no settings for a collection, so
 * what they say rides where it can: the variables of the collection over the globals are the base
 * environment and the environments the sub ones, and the auth and the headers go down to the first
 * level and to the loose requests. The notes of the collection are its description. The WebSocket
 * connections of the workspace sit at the top, after the requests, in the file that has them.
 * Messages have no place in Insomnia and stay out.
 */
export function collectionDocumentOf(
    collection: WorkspaceCollectionSource,
    workspace: Pick<WorkspaceData, 'auth' | 'connections' | 'environments' | 'globals'>,
): FormatDocument {
    const { description } = collection.settings;
    const above = collection.settings.auth ?? workspace.auth;
    const children = childrenInOrder<FormatDocument>(collection, {
        folder: (folder) =>
            folderDocumentsOf([withHeadersOf(collection, folder)], [collection.name], above),
        item: (item) =>
            [item]
                .filter(({ kind }) => kind === 'request')
                .map((request) =>
                    requestDocumentOf(request, [collection.name], above, [collection]),
                ),
    });
    const sockets = workspace.connections
        .filter((connection) => connection.transport === 'websocket')
        .map((connection) => websocketDocumentOf(connection, workspace.auth));
    const environments = environmentsDocumentOf(
        collection.name,
        // Insomnia has no globals in a collection: they go at its lowest level, the base.
        variablesOverGlobals(collection.settings.variables, workspace.globals),
        workspace.environments,
    );

    return {
        type: FILE_TYPE,
        schema_version: SCHEMA_VERSION,
        name: collection.name,
        meta: {
            id: insomniaIdOf('wrk', collection.name),
            ...(description === undefined ? {} : { description }),
        },
        collection: [...children, ...sockets],
        ...(environments === undefined ? {} : { environments }),
    };
}
