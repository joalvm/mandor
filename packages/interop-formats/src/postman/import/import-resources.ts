import {
    claimRoute,
    collectionResourceOf,
    inSequence,
    type ImportResource,
    type InteropDocument,
} from '@mandor/interop-core';

import { environmentResourceOf } from './environment-resource.js';
import { folderTreeOf, pathKey } from './folder-resources.js';
import { folderSettingsOf } from './folder-settings-of.js';
import { requestResourceOf } from './request-resource.js';

/** The whole document as the resources a workspace holds: its environment and the collection it is. */
export function importResourcesOf(document: InteropDocument): ImportResource[] {
    const environment = environmentResourceOf(document);

    return [
        ...(environment === undefined ? [] : [environment]),
        ...collectionResourcesOf(document),
    ];
}

/**
 * The collection a document is: its settings, one folder per group of its tree and one request per
 * operation. Folders and requests share the directory they sit in, so two of the same name take
 * `-2`.
 */
export function collectionResourcesOf(document: InteropDocument): ImportResource[] {
    const level = folderSettingsOf(
        { ...document, security: document.defaultSecurity },
        document.security,
        'collection',
    );
    const head = collectionResourceOf({
        name: document.name,
        ...level.settings,
        origin: originOfCollection(document.sourceId),
    });
    const collection = { ...head, degradations: level.degradations };
    const tree = folderTreeOf(document, collection.route);
    const items = document.operations.flatMap((operation) => {
        const http = operation.http;

        if (http === undefined) {
            return [];
        }

        const parent =
            http.group === undefined
                ? collection.route
                : (tree.routes.get(pathKey(http.group)) ?? collection.route);
        const route = claimRoute(tree.taken, parent, http.summary ?? operation.name, 'request');

        return [requestResourceOf(document, operation, http, route)];
    });

    return [collection, ...inSequence(document.sequence, { folders: tree.resources, items })];
}

function originOfCollection(sourceId: string): { kind: 'postman'; sourceId: string } {
    return { kind: 'postman', sourceId };
}
