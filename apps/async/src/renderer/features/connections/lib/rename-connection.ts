import type { Connection } from '@mandor/schema';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import type { WorkspaceScope } from './workspace-scope.js';

/**
 * Persists a rename the store already applied optimistically. A refusal restores the previous
 * connection as-is and lands the code on it; the interface translates the code, never the
 * raw message.
 */
export async function renameConnection(
    scope: WorkspaceScope,
    connection: Connection,
    name: string,
): Promise<void> {
    const result = await asyncBridge.connection.update({
        ...scope,
        changes: { name },
        connectionId: connection.id,
    });

    if (result.ok) {
        return;
    }

    const store = connectionsStore.getState();

    store.upsertConnection(connection);
    store.setConnectionError(connection.id, result.error.code);
}
