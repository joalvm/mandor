import type { ListedWorkspace } from '@mandor/ipc';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { initialWorkspacesSlice, type WorkspacesSlice } from './workspaces.slice.js';

type WorkspacesActions = {
    reset: () => void;
    setWorkspaces: (workspaces: readonly ListedWorkspace[]) => void;
    upsertWorkspace: (workspace: ListedWorkspace) => void;
};

export type WorkspacesStore = WorkspacesActions & WorkspacesSlice;
type WorkspacesStoreApi = StoreApi<WorkspacesStore>;

function upsert(list: readonly ListedWorkspace[], entry: ListedWorkspace): ListedWorkspace[] {
    if (list.some((existing) => existing.id === entry.id)) {
        return list.map((existing) => (existing.id === entry.id ? entry : existing));
    }

    return [...list, entry];
}

function actionsFor(set: WorkspacesStoreApi['setState']): WorkspacesActions {
    const actions: WorkspacesActions = {
        reset: () => {
            set({ ...initialWorkspacesSlice(), ...actions }, true);
        },
        setWorkspaces: (workspaces) => {
            set({ workspaces: [...workspaces] });
        },
        upsertWorkspace: (workspace) => {
            set((state) => ({ workspaces: upsert(state.workspaces, workspace) }));
        },
    };

    return actions;
}

/**
 * The workspaces of the open repository. The shell store keeps which one is active, because
 * that is session state and survives a restart; the list itself is read from disk every time a
 * repository is opened, so it lives here and never reaches the session file.
 */
export function createWorkspacesStore(): WorkspacesStoreApi {
    return createStore<WorkspacesStore>()((set) => {
        const actions = actionsFor(set);

        return { ...initialWorkspacesSlice(), ...actions };
    });
}

export const workspacesStore = scopeToOrigin(createWorkspacesStore());
