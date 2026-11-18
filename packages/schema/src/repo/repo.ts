/** A container like a user account: holds mandor.yaml and workspaces/, with no domain of its own. */
export type Repo = {
    formatVersion: number;
    name: string;
    /** Workspace ids in display order. Reordering touches this list, not the workspaces. */
    workspaces: string[];
};
