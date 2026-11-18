export type WorkspaceSlice = {
    activeWorkspaceId: string | null;
};

export function initialWorkspaceSlice(): WorkspaceSlice {
    return { activeWorkspaceId: null };
}
