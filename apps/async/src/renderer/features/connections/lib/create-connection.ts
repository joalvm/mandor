import type { ConnectionCreateRequest, Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import type { WorkspaceScope } from './workspace-scope.js';

/** Persists a new connection through main and projects it into the store on success. */
export async function createConnection(
    scope: WorkspaceScope,
    input: Omit<ConnectionCreateRequest, 'workspaceId'>,
): Promise<Result<Connection>> {
    const result = await asyncBridge.connection.create({ ...scope, ...input });

    if (result.ok) {
        connectionsStore.getState().upsertConnection(result.value);
    }

    return result;
}
