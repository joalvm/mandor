import type { ConnectionChanges } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { createPendingWrites } from '@mandor/shell';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import type { WorkspaceScope } from './workspace-scope.js';

/** What an edit of the connection may touch. The id is the file name: never an edit. */
export type ConnectionWrite = Partial<Omit<Connection, 'id'>>;

type Waiting = { scope: WorkspaceScope; changes: ConnectionWrite };

const PENDING = createPendingWrites<string, Waiting>(writeNow);

/**
 * Saves a connection on its own: the edit lands in the record at once and travels to disk the
 * moment the typing stops, so the user never has to think about saving. Edits that arrive
 * within the same pause travel together in one write.
 *
 * A refusal leaves the edit in the window and lands the code on the connection; the interface
 * translates the code, never the raw message.
 */
export function scheduleConnectionWrite(
    scope: WorkspaceScope,
    connection: Connection,
    change: ConnectionWrite,
): void {
    const changes = { ...(PENDING.waiting(connection.id)?.changes ?? {}), ...change };

    connectionsStore.getState().upsertConnection({ ...connection, ...change });
    PENDING.schedule(connection.id, { scope, changes });
}

/**
 * Sends every connection write still waiting for the typing to stop now, and answers once main
 * has them: the files changed under the window and are about to be read again.
 */
export function settlePendingConnectionWrites(): Promise<void> {
    return PENDING.flushWhere(() => true);
}

async function writeNow(connectionId: string, { scope, changes }: Waiting): Promise<void> {
    const result = await asyncBridge.connection.update({
        ...scope,
        changes: onTheWire(changes),
        connectionId,
    });

    if (!result.ok) {
        connectionsStore.getState().setConnectionError(connectionId, result.error.code);
    }
}

/**
 * An edit that leaves the connection with no script says so with a field set to nothing, and
 * nothing is not something the channel can tell from a field it never got: it travels as `null`.
 */
function onTheWire(changes: ConnectionWrite): ConnectionChanges {
    if ('scripts' in changes && changes.scripts === undefined) {
        return { ...changes, scripts: null };
    }

    return changes;
}
