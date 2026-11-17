import type {
    InteropDocument,
    InteropGroup,
    InteropOperation,
    InteropSecurityScheme,
    InteropVariable,
} from '@mandor/interop-core';

import { documentSourceId } from '../document/document-source-id.js';
import type { PostmanCollection, PostmanItem } from '../document/postman-collection-schema.js';
import { authSchemeOf, securityOf } from './auth-scheme-of.js';
import { notesOf } from './collection-notes.js';
import { descriptionOf } from './description-of.js';
import { extrasOf } from './extras-of.js';
import { scriptsOf } from './map-scripts.js';
import { operationOf } from './operation-of.js';
import { uniqueName } from './unique-name.js';
import { variableOf } from './variable-of.js';

const FOLDER_CONSUMED = ['name', 'item', 'description', 'variable', 'auth', 'event', 'id'];

type Walk = {
    groups: InteropGroup[];
    operations: InteropOperation[];
    sequence: ('folder' | 'item')[];
    security: Record<string, InteropSecurityScheme>;
    /** The names of the operations so far: one name, one operation. */
    taken: Set<string>;
};

/**
 * A collection as the intermediate document: its folders as groups, parents first, each request
 * as an operation of a channel of its own, and the auth of every level as a named scheme.
 */
export function collectionToInterop(collection: PostmanCollection): InteropDocument {
    const walk: Walk = {
        groups: [],
        operations: [],
        sequence: [],
        security: {},
        taken: new Set(),
    };
    const root = securityOf(authSchemeOf(collection.auth), 'collections');

    if (root.scheme !== undefined) {
        walk.security['collection'] = root.scheme;
    }

    visit(collection.item, [], walk);

    return {
        name: collection.info.name,
        description: descriptionOf(collection.info.description),
        sourceId: documentSourceId(
            'collection',
            collection.info._postman_id ?? undefined,
            collection.info.name,
        ),
        servers: [],
        security: walk.security,
        channels: walk.operations.map(({ name, http }) => ({
            name,
            address: http?.url ?? '/',
            extras: {},
        })),
        operations: walk.operations,
        defaultSecurity: root.scheme === undefined ? [] : ['collection'],
        payloadSchemas: {},
        notes: notesOf(collection),
        extras: {},
        variables: declaredIn(collection.variable),
        scripts: scriptsOf(collection.event),
        groups: walk.groups,
        sequence: walk.sequence,
    };
}

function declaredIn(rows: PostmanCollection['variable']): InteropVariable[] {
    return (rows ?? []).map((row) => variableOf(row, row.disabled !== true));
}

function visit(items: readonly PostmanItem[], path: string[], walk: Walk): void {
    const siblings = new Set<string>();

    for (const item of items) {
        if (item.item !== undefined) {
            visitFolder(item, item.item, { path, siblings }, walk);

            continue;
        }

        if (item.request !== undefined) {
            visitRequest(item, item.request, path, walk);
        }
    }
}

function visitFolder(
    item: PostmanItem,
    children: readonly PostmanItem[],
    where: { path: string[]; siblings: Set<string> },
    walk: Walk,
): void {
    const path = [...where.path, uniqueName(where.siblings, nameOf(item.name, 'folder'))];
    const { security, scheme } = securityOf(
        authSchemeOf(item.auth),
        `folder:${JSON.stringify(path)}`,
    );

    if (scheme !== undefined) {
        walk.security[`folder:${JSON.stringify(path)}`] = scheme;
    }

    walk.sequence.push('folder');
    walk.groups.push({
        path,
        description: descriptionOf(item.description),
        variables: declaredIn(item.variable),
        security,
        scripts: scriptsOf(item.event),
        extras: extrasOf(item, FOLDER_CONSUMED),
    });
    visit(children, path, walk);
}

function visitRequest(
    item: PostmanItem,
    request: NonNullable<PostmanItem['request']>,
    path: string[],
    walk: Walk,
): void {
    const name = uniqueName(walk.taken, [...path, nameOf(item.name, 'request')].join(' / '));
    const { operation, scheme } = operationOf(item, request, { name, group: path });

    walk.sequence.push('item');

    if (scheme !== undefined) {
        walk.security[`request:${name}`] = scheme;
    }

    walk.operations.push(operation);
}

function nameOf(name: string | null | undefined, fallback: string): string {
    return name === undefined || name === null || name.trim() === '' ? fallback : name;
}
