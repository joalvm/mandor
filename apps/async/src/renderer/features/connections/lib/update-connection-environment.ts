import type { Connection } from '@mandor/schema';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import { openSocket } from './open-socket.js';
import { toggleConnection } from './toggle-connection.js';
import type { WorkspaceScope } from './workspace-scope.js';

/** A socket on its way up is as good as one that is up: it was resolved with the old values too. */
function isLive(connectionId: string): boolean {
    const state = connectionsStore.getState().states[connectionId];

    return state === 'open' || state === 'connecting';
}

/**
 * Writes the environment of a connection and, when its socket is up, reopens it. The URL and the
 * headers of the handshake were resolved with the environment that just stopped being the one
 * chosen, so leaving the socket alone would keep working against exactly what the user changed.
 */
export async function updateConnectionEnvironment(
    scope: WorkspaceScope,
    connection: Connection,
    environmentId: string | null,
): Promise<void> {
    const live = isLive(connection.id);
    const result = await asyncBridge.connection.update({
        ...scope,
        changes: { environmentId },
        connectionId: connection.id,
    });
    const store = connectionsStore.getState();

    if (!result.ok) {
        store.setConnectionError(connection.id, result.error.code);

        return;
    }

    store.upsertConnection(result.value);

    if (!live) {
        return;
    }

    // The close asked for here is a close, not a fault: the manager tells them apart to decide
    // whether to reconnect on its own, and this one already has its reopening.
    await toggleConnection(result.value, true, scope);
    await openSocket(result.value, scope);
}
