import type { ListedWorkspace } from '@mandor/ipc';

import type { WorkspacesStore } from './workspaces-store.js';

const EMPTY_WORKSPACES: ListedWorkspace[] = [];

export function selectWorkspaces(state: WorkspacesStore): readonly ListedWorkspace[] {
    return state.workspaces.length === 0 ? EMPTY_WORKSPACES : state.workspaces;
}
