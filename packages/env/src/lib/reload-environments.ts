import { envStore } from '../env-store.js';
import { flushPendingEnvironmentWrites } from './pending-environment-write.js';
import { flushPendingGlobalsWrite } from './pending-globals-write.js';

/**
 * Reads the environments and the globals again because their files changed
 * on disk without the window. Whatever was typed and not yet written goes first, so what comes
 * back is the files with both changes in them and the typing is never read over.
 */
export async function reloadEnvironments(workspaceId: string): Promise<void> {
    await Promise.all([flushPendingEnvironmentWrites(workspaceId), flushPendingGlobalsWrite()]);
    await envStore.getState().load(workspaceId);
}
