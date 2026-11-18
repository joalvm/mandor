import type { ListedWorkspace } from '@mandor/ipc';

export type WorkspacesSlice = {
    workspaces: ListedWorkspace[];
};

export function initialWorkspacesSlice(): WorkspacesSlice {
    return { workspaces: [] };
}
