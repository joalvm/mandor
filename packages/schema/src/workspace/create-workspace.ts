import { parseWorkspace } from './parse-workspace.js';
import type { Workspace } from './workspace.js';
import type { WorkspaceKind } from './workspace-kinds.js';

export type CreateWorkspaceInput = {
    /** The opaque id the caller minted; it names the folder and never follows the name. */
    id: string;
    name: string;
    kind: WorkspaceKind;
};

/** Creates a workspace under the id the caller minted. */
export function createWorkspace({ id, name, kind }: CreateWorkspaceInput): Workspace {
    return parseWorkspace({ id, kind, name });
}
