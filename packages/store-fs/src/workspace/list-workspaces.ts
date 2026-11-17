import type { Workspace } from '@mandor/schema';

import type { LoadWarning } from '../disk/load-warning.js';
import { readWorkspace } from './read-workspace.js';

export type ListedWorkspaces = {
    workspaces: Workspace[];
    warnings: LoadWarning[];
};

/**
 * Reads the given workspaces and keeps that order. The order is the user's, stored in the repo
 * file, so it cannot be derived from `readdir`: the filesystem sorts by name or by nothing.
 */
export async function listWorkspaces(
    root: string,
    ids: readonly string[],
): Promise<ListedWorkspaces> {
    const reads = await Promise.all(ids.map((id) => readWorkspace(root, id)));

    return {
        workspaces: reads.filter((read) => read.ok).map((read) => read.value),
        warnings: reads.filter((read) => !read.ok).map((read) => read.warning),
    };
}
