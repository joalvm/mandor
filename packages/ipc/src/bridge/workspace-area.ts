import type { Workspace } from '@mandor/schema';

import type { WorkspaceCreateRequest } from '../workspace/workspace-create.js';
import type { WorkspaceDeleteRequest } from '../workspace/workspace-delete.js';
import type { ListedWorkspace } from '../workspace/workspace-list.js';
import type { WorkspaceRenameRequest } from '../workspace/workspace-rename.js';
import type { Empty, Result } from '../result/result.js';

/**
 * The workspaces of the active origin. The kind is not a request field —main stamps it from
 * the app it hosts— and no channel names the directory the workspace lives in.
 */
export type WorkspaceArea = {
    create: (input: WorkspaceCreateRequest) => Promise<Result<Workspace>>;
    /** Removes one workspace and its contents; the renderer confirms by name before asking. */
    delete: (input: WorkspaceDeleteRequest) => Promise<Result<Empty>>;
    list: () => Promise<Result<ListedWorkspace[]>>;
    rename: (input: WorkspaceRenameRequest) => Promise<Result<Workspace>>;
};
