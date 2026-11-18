import type { Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { createLatestRead } from '@mandor/shell';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import type { WorkspaceScope } from './workspace-scope.js';

/** The list on screen is the one of the workspace asked for last. */
const ask = createLatestRead();

/** Loads the connections of an opened workspace, replacing the list of the previous one. */
export async function loadConnections(scope: WorkspaceScope): Promise<Result<Connection[]>> {
    const latest = ask();
    const result = await asyncBridge.connection.list(scope);

    if (result.ok && latest()) {
        connectionsStore.getState().setConnections(result.value);
    }

    return result;
}
