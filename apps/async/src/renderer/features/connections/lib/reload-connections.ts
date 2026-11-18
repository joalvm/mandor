import { loadConnections } from './load-connections.js';
import { settlePendingConnectionWrites } from './pending-connection-write.js';
import type { WorkspaceScope } from './workspace-scope.js';

/**
 * Reads the connections again because their files changed on disk without the window. What was
 * typed goes to main first, so the read never erases it, and whatever is live stays as it is.
 */
export async function reloadConnections(scope: WorkspaceScope): Promise<void> {
    await settlePendingConnectionWrites();
    await loadConnections(scope);
}
