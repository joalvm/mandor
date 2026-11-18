import { type CollectionItem, inheritedHeaders, parseRequestItem } from '@mandor/schema';

import type {
    InteropDocument,
    InteropGroup,
    InteropOperation,
    InteropPayloadSchema,
    InteropSecurityScheme,
} from '../ir/interop-document.js';
import { withFoldersApart } from './folders-apart.js';
import { operationOfItem } from './operation-of-item.js';
import {
    operationOfRequest,
    type RequestFolder,
    type RequestSecurity,
} from './operation-of-request.js';
import { channelNameOf, channelsOf, requestChannelsOf } from './channels-of-workspace.js';
import { defaultSecurityOf, ownAuthOf, schemesOf } from './security-of-auth.js';
import { serverOfConnection } from './servers-of-connections.js';
import { serversOfEnvironments } from './servers-of-environments.js';
import { walkedFolders, type WalkedFolder, type WalkedLevel } from './walked-folders.js';
import type {
    WorkspaceCollectionSource,
    WorkspaceData,
    WorkspaceFolderNode,
} from './workspace-data.js';

/**
 * The workspace as the same intermediate model an import produces — the road in, read the
 * other way. What the workspace holds, the document says again; what the workspace never kept,
 * nobody invents: a workspace of messages alone speaks no HTTP, and its document is the one it
 * always was — the servers of the connections, no security, no default.
 */
export function workspaceToIr(source: WorkspaceData): InteropDocument {
    const workspace = withFoldersApart(source);
    const schemas: Record<string, InteropPayloadSchema> = {};
    const http = httpOf(workspace);
    const operations = operationsOf(workspace, http, schemas);
    const groups = groupsOf(workspace, http);

    return {
        name: workspace.name,
        sourceId: '',
        servers: [
            ...workspace.connections.map(serverOfConnection),
            ...(http === undefined
                ? []
                : serversOfEnvironments(workspace.environments, workspace.serverEnvironments)),
        ],
        security: http?.security ?? {},
        channels: [...channelsOf(itemsOf(workspace)), ...requestChannelsOf(operations)],
        operations,
        defaultSecurity: http?.defaultSecurity ?? [],
        payloadSchemas: schemas,
        notes: [],
        extras: {},
        ...(groups.length === 0 ? {} : { groups }),
    };
}

/** The folder an operation hangs from, and the levels whose headers its request sends. */
type OperationFolder = RequestFolder & { levels: readonly WalkedLevel[] };

/** The HTTP side of the document: the schemes of the chain, the default, and who names them. */
type HttpPart = RequestSecurity & {
    security: Record<string, InteropSecurityScheme>;
    defaultSecurity: string[];
};

/**
 * The part a workspace with requests adds: its servers speak of environments, its security of
 * the auth chain read in order — the workspace, each collection, the folders, each request — so
 * a name claimed by the first shape that says it stays its own. The default is the workspace's
 * own scheme; an operation that answers nothing inherits it.
 */
function httpOf(workspace: WorkspaceData): HttpPart | undefined {
    const requests = itemsOf(workspace).filter((item) => item.kind === 'request');

    if (requests.length === 0) {
        return undefined;
    }

    const { security, nameOf } = schemesOf([
        ...(workspace.auth === undefined ? [] : [workspace.auth]),
        ...workspace.collections.flatMap((collection) =>
            collection.settings.auth === undefined ? [] : [collection.settings.auth],
        ),
        ...foldersOf(workspace).flatMap(({ folder }) =>
            folder.settings.auth === undefined ? [] : [folder.settings.auth],
        ),
        ...requests.flatMap((request) => {
            const auth = ownAuthOf(request);

            return auth === undefined ? [] : [auth];
        }),
    ]);

    return {
        security,
        defaultSecurity: defaultSecurityOf(workspace.auth, nameOf),
        nameOf,
    };
}

/** Every folder of the workspace with what its requests inherit, parents first. */
function foldersOf(workspace: WorkspaceData): WalkedFolder[] {
    return workspace.collections.flatMap((collection) =>
        walkedFolders(collection.folders, collection.settings.auth),
    );
}

function itemsOf(workspace: WorkspaceData): readonly CollectionItem[] {
    return workspace.collections.flatMap((collection) => [
        ...walkedFolders(collection.folders, undefined).flatMap(({ folder }) => folder.items),
        ...collection.items,
    ]);
}

/**
 * The folders as the document's own tree. The document joins every collection, and a path says
 * one group. The first level is already apart; below it, the first collection to name a path keeps it.
 */
function groupsOf(workspace: WorkspaceData, http: HttpPart | undefined): InteropGroup[] {
    const groups = new Map<string, InteropGroup>();

    for (const { folder, path } of foldersOf(workspace)) {
        const key = JSON.stringify(path);

        if (!groups.has(key)) {
            groups.set(key, groupOf(folder, path, http));
        }
    }

    return [...groups.values()];
}

function groupOf(
    folder: WorkspaceFolderNode,
    path: readonly string[],
    http: HttpPart | undefined,
): InteropGroup {
    const { description, auth } = folder.settings;

    return {
        path: [...path],
        ...(description === undefined ? {} : { description }),
        security: auth === undefined ? null : defaultSecurityOf(auth, nameOf(http)),
        scripts: [],
        extras: {},
    };
}

/** Who names a scheme: nobody, in a workspace whose document speaks no HTTP. */
function nameOf(http: HttpPart | undefined): RequestSecurity['nameOf'] {
    return http?.nameOf ?? (() => null);
}

function operationsOf(
    workspace: WorkspaceData,
    http: HttpPart | undefined,
    schemas: Record<string, InteropPayloadSchema>,
): InteropDocument['operations'] {
    const operations: InteropOperation[] = [];

    for (const collection of workspace.collections) {
        const tag = collectionTag(collection);

        operations.push(...folderOperationsOf(collection, http, schemas));

        for (const item of collection.items) {
            operations.push(operationOf(item, tag, http, schemas));
        }
    }

    return operations;
}

/** The requests of the folders of one collection, each tagged as its folder of the first level. */
function folderOperationsOf(
    collection: WorkspaceCollectionSource,
    http: HttpPart | undefined,
    schemas: Record<string, InteropPayloadSchema>,
): InteropOperation[] {
    const operations: InteropOperation[] = [];

    for (const walked of walkedFolders(
        collection.folders,
        collection.settings.auth,
        [],
        [collection],
    )) {
        const tag = folderTag(walked);

        for (const item of walked.folder.items) {
            operations.push(operationOf(item, tag, http, schemas));
        }
    }

    return operations;
}

/** The tag the requests at the top of a collection carry: its name, and the auth it speaks. */
function collectionTag(collection: WorkspaceCollectionSource): OperationFolder {
    const { auth } = collection.settings;

    return {
        name: collection.name,
        ...(auth === undefined ? {} : { auth }),
        levels: [collection],
    };
}

/**
 * The tag a folder's requests carry: the folder of the first level they hang from, so deeper ones
 * flatten into it and two of one name in different branches never merge. The auth is the closest.
 */
function folderTag({ path, auth, levels }: WalkedFolder): OperationFolder {
    return {
        name: path[0] ?? '',
        ...(auth === undefined ? {} : { auth }),
        levels,
    };
}

function operationOf(
    item: CollectionItem,
    folder: OperationFolder,
    http: HttpPart | undefined,
    schemas: Record<string, InteropPayloadSchema>,
): InteropOperation {
    if (item.kind === 'request') {
        return operationOfRequest(
            withInheritedHeaders(item, folder.levels),
            folder,
            http ?? { nameOf: () => null, defaultSecurity: [] },
        );
    }

    registerSchema(item, schemas);

    return operationOfItem(item, channelNameOf(item), folder.name);
}

/**
 * The request with the lines it sends: a document has no levels to keep them in, so each operation
 * says what its request inherits, as parameters of its own.
 */
function withInheritedHeaders(
    item: CollectionItem,
    levels: readonly WalkedLevel[],
): CollectionItem {
    const { sent } = inheritedHeaders(levels, parseRequestItem(item).headers);

    return { ...item, body: { ...item.body, headers: sent } };
}

/** The schema the item embeds is registered under the name its message answers to. */
function registerSchema(item: CollectionItem, schemas: Record<string, InteropPayloadSchema>): void {
    const schema = item.body['schema'];
    const name =
        typeof item.body['messageName'] === 'string' ? item.body['messageName'] : item.name;

    if (typeof schema !== 'string' || schema === '') {
        return;
    }

    schemas[name] = { text: schema, extras: {} };
}
