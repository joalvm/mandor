import type { FormatFile, WorkspaceData, WorkspaceFolderNode } from '@mandor/interop-core';
import {
    slugify,
    BUNDLE_FORMAT,
    ownScriptsOrNothing,
    type CollectionItem,
    type Connection,
    type Environment,
    type Variable,
    type WorkspaceKind,
} from '@mandor/schema';

type Document = FormatFile['document'];

/** The record without the keys that say nothing: an absent value and an empty list are no decision. */
function present(entries: Record<string, unknown>): Document {
    return Object.fromEntries(
        Object.entries(entries).filter(
            ([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0),
        ),
    );
}

/** A secret leaves empty and marked: the value belongs to whoever filled it in, never to a file. */
function variableOf(variable: Variable): Variable {
    return {
        name: variable.name,
        value: variable.secret ? '' : variable.value,
        enabled: variable.enabled,
        secret: variable.secret,
    };
}

function environmentOf(environment: Environment): Document {
    return {
        id: environment.id,
        name: environment.name,
        variables: environment.variables.map(variableOf),
    };
}

/** The file's own claim over a connection is not the connection's: the import will make its own. */
function connectionOf(connection: Connection): Document {
    return Object.fromEntries(Object.entries(connection).filter(([key]) => key !== 'origin'));
}

function itemOf(item: CollectionItem): Document {
    return { kind: item.kind, name: item.name, ...present({ tags: item.tags }), body: item.body };
}

/** A collection or a folder: what it declares of itself, then what hangs from it. */
function levelOf(level: WorkspaceFolderNode): Document {
    const { description, variables, auth, headers, scripts } = level.settings;

    return {
        name: level.name,
        ...present({
            description,
            variables,
            auth,
            headers,
            scripts: ownScriptsOrNothing(scripts),
            folders: level.folders.map(levelOf),
            items: level.items.map(itemOf),
            sequence: level.sequence,
        }),
    };
}

function bundleOf(data: WorkspaceData, app: WorkspaceKind): Document {
    return {
        mandor: 'workspace',
        formatVersion: BUNDLE_FORMAT,
        app,
        workspace: {
            name: data.name,
            ...present({ auth: data.auth }),
        },
        environments: data.environments.map(environmentOf),
        collections: data.collections.map(levelOf),
        docs: data.docs.map((doc) => ({ name: doc.name, title: doc.title, text: doc.text })),
        // Only Realtime has connections: a workspace without any writes no key for them.
        ...present({
            connections: data.connections.map(connectionOf),
            globals: data.globals.map(variableOf),
        }),
    };
}

/** The workspace as the one bundle it is, in a file named after it. */
export function documentsOf(data: WorkspaceData, app: WorkspaceKind): FormatFile[] {
    return [{ path: `${slugify(data.name)}.mandor.yaml`, document: bundleOf(data, app) }];
}
