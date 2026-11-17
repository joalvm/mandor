import { selectGroupOfTab, shellStore } from '@mandor/shell';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import type { WorkspaceScope } from './workspace-scope.js';

/**
 * Takes a connection off the disk and out of the window. Nothing is removed until main answers:
 * a collection that forgets a connection the disk still holds is worse than a slow one. The tab it
 * had open goes with it, because the resource behind it no longer exists.
 */
export async function deleteConnection(scope: WorkspaceScope, connectionId: string): Promise<void> {
    const result = await asyncBridge.connection.delete({ ...scope, connectionId });

    if (!result.ok) {
        connectionsStore.getState().setConnectionError(connectionId, result.error.code);

        return;
    }

    const group = selectGroupOfTab(shellStore.getState(), connectionId);

    if (group !== null) {
        shellStore.getState().closeTab(group, connectionId);
    }

    connectionsStore.getState().removeConnection(connectionId);
}
