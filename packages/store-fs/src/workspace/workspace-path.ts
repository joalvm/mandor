import { join } from 'node:path';

import { assertSegment } from '@mandor/schema';

import { workspacesDir } from '../repo/repo-path.js';

const WORKSPACE_FILE = 'workspace.yaml';

/**
 * Directory of one workspace. The id is validated before it can reach `join`, so a
 * traversal attempt fails here instead of resolving into a path outside the root.
 */
export function workspaceDir(root: string, workspaceId: string): string {
    assertSegment(workspaceId);

    return join(workspacesDir(root), workspaceId);
}

/** Path of the file that describes the workspace. */
export function workspaceFile(root: string, workspaceId: string): string {
    return join(workspaceDir(root, workspaceId), WORKSPACE_FILE);
}
