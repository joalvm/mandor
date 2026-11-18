import { bridge, createLatestRead, fireAndForget } from '@mandor/shell';

import { activateWorkspace } from './adopt-origin.js';
import { workspacesStore } from './workspaces-store.js';

/** The list on screen is the one read last: an answer overtaken by a later read is dropped. */
const ask = createLatestRead();

/**
 * Reads the workspaces again because the repository changed under the window. The active one
 * stays unless its folder went away, in which case the first one that is left takes its place.
 */
export async function reloadWorkspaces(): Promise<void> {
    const latest = ask();
    const result = await bridge.workspace.list();

    if (!result.ok || !latest()) {
        return;
    }

    workspacesStore.getState().setWorkspaces(result.value);
    activateWorkspace(result.value);
}

export function reloadWorkspacesSoon(): void {
    fireAndForget(reloadWorkspaces());
}
