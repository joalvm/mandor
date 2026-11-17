import type { ListedWorkspace, OpenedOrigin } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';

import { workspacesStore } from './workspaces-store.js';

/**
 * Takes an origin that was just opened and makes it the one the window is working in: its
 * workspaces and the session it saved last time. No tab is opened here: what the window shows
 * is what the user left open, and a window that opens onto nothing is saying so honestly.
 */
export async function adoptOrigin(originId: string, opened: OpenedOrigin): Promise<void> {
    workspacesStore.getState().setWorkspaces(opened.workspaces);
    await shellStore.getState().loadSession(originId);
    activateWorkspace(opened.workspaces);
}

/** The session may name a workspace that is no longer on disk, or none at all. */
export function activateWorkspace(workspaces: readonly ListedWorkspace[]): void {
    const state = shellStore.getState();
    const known = workspaces.some((workspace) => workspace.id === state.activeWorkspaceId);
    const first = workspaces[0];

    if (known || first === undefined) {
        return;
    }

    state.setActiveWorkspace(first.id);
}
