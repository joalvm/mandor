import { leavesOf, type ListedWorkspace } from '@mandor/ipc';
import { parseResourceUri } from '@mandor/schema';
import { shellStore } from '@mandor/shell';

function isInside(resource: string, workspaceId: string): boolean {
    const parts = parseResourceUri(resource);

    return parts.scope === 'workspace' && parts.workspace === workspaceId;
}

/**
 * What the window does once a workspace is gone from disk: nothing keeps looking at it. Its tabs
 * close, each letting go of what it held, and none can be reopened onto nothing. If it was the open
 * one, the window moves to the next that is left, or to none, which is what an empty origin shows.
 */
export function leaveWorkspace(workspaceId: string, kept: readonly ListedWorkspace[]): void {
    const state = shellStore.getState();

    for (const leaf of leavesOf(state.grid)) {
        for (const tab of leaf.tabs.filter(({ resource }) => isInside(resource, workspaceId))) {
            state.closeTab(leaf.id, tab.id);
        }
    }

    for (const { tab } of shellStore.getState().closedTabs) {
        if (isInside(tab.resource, workspaceId)) {
            state.removeResource(tab.resource);
        }
    }

    if (state.activeWorkspaceId === workspaceId) {
        state.setActiveWorkspace(kept[0]?.id ?? null);
    }
}
