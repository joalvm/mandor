/**
 * Where a connection lives: the workspace that owns it, inside the active origin. The origin
 * is not part of the scope because main writes to the active one and never takes it from the
 * renderer.
 */
export type WorkspaceScope = {
    workspaceId: string;
};
