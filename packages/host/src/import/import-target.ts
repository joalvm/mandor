import type { ImportTarget } from '@mandor/ipc';
import { newId, type WorkspaceKind } from '@mandor/schema';
import { createWorkspace, loadRepo, globalsFile, repoFile, workspaceDir } from '@mandor/store-fs';

import { repoRelative } from '../repo/repo-relative.js';
import { freeWorkspaceName } from './free-workspace-name.js';

/**
 * The workspace an import writes into: the one the request names, or a new one that takes the
 * name of the document. It is made here, inside the act that writes the plan, so the workspace
 * and what it holds land in one commit.
 */
export async function workspaceOfTarget(
    root: string,
    kind: WorkspaceKind,
    target: ImportTarget,
): Promise<string> {
    if ('workspaceId' in target) {
        return target.workspaceId;
    }

    const opened = await loadRepo(root);
    const name = freeWorkspaceName(
        opened.workspaces.map((workspace) => workspace.name),
        target.newWorkspace,
    );

    return (await createWorkspace(root, { id: newId(), name, kind })).id;
}

/** What the commit of an import takes: the workspace, and the repo file when it was just made. */
export function targetPlaces(root: string, target: ImportTarget, workspaceId: string): string[] {
    const folder = repoRelative(root, workspaceDir(root, workspaceId));

    // The globals of the origin take what a document brings for them, whatever the target.
    const globals = repoRelative(root, globalsFile(root));

    if ('workspaceId' in target) {
        return [folder, globals];
    }

    return [folder, repoRelative(root, repoFile(root)), globals];
}
