import type { RepoChange } from '@mandor/git';
import {
    CHANNELS,
    connectionCreateRequestSchema,
    connectionDeleteRequestSchema,
    connectionListRequestSchema,
    connectionUpdateRequestSchema,
    type ConnectionChanges,
    type Empty,
} from '@mandor/ipc';
import { newId, type Connection } from '@mandor/schema';
import {
    guardedWrite,
    type HandlerIpc,
    nameOnDisk,
    rememberText,
    repoRelative,
    reportUnreadable,
    reshapeRepo,
    rootedHandler,
    type UnreadableDeps,
} from '@mandor/host';
import {
    connectionFile,
    connectionTextWith,
    createConnection as writeConnection,
    deleteConnection as dropConnection,
    listConnections as readConnections,
    readConnection,
    readTextOrNull,
    updateConnection as editConnection,
    type ConnectionPatch,
} from '@mandor/store-fs';

/**
 * The four channels a renderer uses to reach the connections of a workspace. They all write to
 * the active origin, which main alone knows the directory of. The scheme of every URL is
 * decided here, at the border of main, and not by the form that sent it.
 */
export function registerConnectionHandlers(ipc: HandlerIpc, reporting: UnreadableDeps): () => void {
    ipc.handle(CHANNELS.connectionCreate, (_event, raw) => createChannel(raw));
    ipc.handle(CHANNELS.connectionList, (_event, raw) => listChannel(reporting)(raw));
    ipc.handle(CHANNELS.connectionUpdate, (_event, raw) => updateChannel(raw));
    ipc.handle(CHANNELS.connectionDelete, (_event, raw) => deleteChannel(raw));

    return () => {
        ipc.removeHandler(CHANNELS.connectionCreate);
        ipc.removeHandler(CHANNELS.connectionList);
        ipc.removeHandler(CHANNELS.connectionUpdate);
        ipc.removeHandler(CHANNELS.connectionDelete);
    };
}

const createChannel = rootedHandler(
    connectionCreateRequestSchema,
    (root, { workspaceId, name, url, transport, headers }) =>
        reshapeRepo(
            {
                root,
                paths: (made: Connection) => [placeOf(root, workspaceId, made.id)],
                change: { kind: 'create-connection', name },
            },
            () =>
                writeConnection(root, workspaceId, {
                    id: newId(),
                    name,
                    url,
                    ...(transport === undefined ? {} : { transport }),
                    ...(headers === undefined ? {} : { headers }),
                }),
        ),
);

function listChannel({ notices, logger }: UnreadableDeps) {
    return rootedHandler(connectionListRequestSchema, async (root, { workspaceId }) => {
        const { connections, warnings } = await readConnections(root, workspaceId);

        reportUnreadable(notices, logger, warnings);

        for (const { id } of connections) {
            const text = await readTextOrNull(connectionFile(root, workspaceId, id));

            rememberText(root, placeOf(root, workspaceId, id), text);
        }

        return connections;
    });
}

// The edit may arrive at the very moment the window is going away — the renderer flushes what it
// owes on its way out — and `guardedWrite` holds it for the quit.
const updateChannel = rootedHandler(
    connectionUpdateRequestSchema,
    async (root, { workspaceId, connectionId, changes }) => {
        const patch = edited(changes);
        const path = placeOf(root, workspaceId, connectionId);

        await guardedWrite({
            root,
            path,
            // Started here, awaited after the turn: a save with a new name, which reads nothing,
            // does not overtake one sent before it.
            change: Promise.resolve(patch.name ?? nameOnDisk(root, path)).then(
                (name): RepoChange => ({ kind: 'update-connection', name }),
            ),
            oursFrom: (base) => connectionTextWith(base ?? '', patch),
            write: async () => {
                await editConnection(root, workspaceId, connectionId, patch);
            },
        });

        return readConnection(root, workspaceId, connectionId);
    },
);

/** Where one connection sits inside the repo, spelled for git. */
function placeOf(root: string, workspaceId: string, connectionId: string): string {
    return repoRelative(root, connectionFile(root, workspaceId, connectionId));
}

/**
 * The id is opaque and the name lives in the file, so the history reads the name before the file
 * goes: there is nothing left on disk to take it from afterwards.
 */
const deleteChannel = rootedHandler(
    connectionDeleteRequestSchema,
    async (root, { workspaceId, connectionId }): Promise<Empty> => {
        const path = placeOf(root, workspaceId, connectionId);

        await reshapeRepo(
            {
                root,
                paths: [path],
                change: { kind: 'delete-connection', name: await nameOnDisk(root, path) },
            },
            () => dropConnection(root, workspaceId, connectionId),
        );

        return {};
    },
);

/**
 * The fields of a connection the renderer may edit. The id is opaque and names the file: it is
 * not here, because it is never an edit.
 */
const EDITABLE_FIELDS = [
    'name',
    'transport',
    'url',
    'headers',
    'params',
    'description',
    'auth',
    'environmentId',
    'websocket',
    'socketio',
    'retry',
    'keepalive',
    'scripts',
] as const;

/**
 * Keeps only the fields the renderer actually sent. Zod spells an absent field as `undefined`,
 * and an `undefined` that reaches the store is not the same as an absent one: on an edit it
 * would erase the value on disk, and on a create it would step over the default the domain owns.
 */
function edited(changes: ConnectionChanges): ConnectionPatch {
    const result: ConnectionPatch = {};

    for (const field of EDITABLE_FIELDS) {
        const value = changes[field];

        if (value !== undefined) {
            Object.assign(result, { [field]: value });
        }
    }

    // The scripts travel as `null` once none is left; on disk that is no scripts field at all.
    if (changes.scripts === null) {
        result.scripts = undefined;
    }

    return result;
}
