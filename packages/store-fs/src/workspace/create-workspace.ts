import { mkdir } from 'node:fs/promises';

import {
    createWorkspace as buildWorkspace,
    type CreateWorkspaceInput,
    parseRepo,
    type Workspace,
} from '@mandor/schema';

import { NameTakenError } from '../collection/name-taken-error.js';
import { documentOf } from '../disk/document-of.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { repoFile } from '../repo/repo-path.js';
import { workspaceDir, workspaceFile } from './workspace-path.js';

/**
 * Creates a workspace and appends it to the display order in the repo file. The repo file is
 * read first: its list is what tells a repeated id from a new one.
 */
export async function createWorkspace(
    root: string,
    input: CreateWorkspaceInput,
): Promise<Workspace> {
    const repo = await readOrThrow(repoFile(root), parseRepo);

    if (repo.value.workspaces.includes(input.id)) {
        throw new NameTakenError(input.id);
    }

    const workspace = buildWorkspace(input);

    await mkdir(workspaceDir(root, workspace.id), { recursive: true });
    await writeDocument(workspaceFile(root, workspace.id), documentOf(workspace), {});
    await writeDocument(repoFile(root), repo.document, {
        workspaces: [...repo.value.workspaces, workspace.id],
    });

    return workspace;
}
