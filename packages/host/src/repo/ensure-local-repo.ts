import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { commitAll, commitMessage, initRepo as initGitRepo } from '@mandor/git';
import { newId, parseRepo, type Repo, type Workspace, type WorkspaceKind } from '@mandor/schema';
import {
    createWorkspace,
    writeRepoTree,
    listWorkspaces,
    readOrThrow,
    repoFile,
} from '@mandor/store-fs';

/** Where git keeps its own state. A directory that has it is already under version control. */
const GIT_DIR = '.git';

/** The repo the app opens into, and the one workspace inside it this app can work in. */
export type LocalRepo = {
    repo: Repo;
    workspace: Workspace;
};

/** What to call the repo and the workspace on a machine that has neither yet. */
export type LocalRepoRequest = {
    kind: WorkspaceKind;
    name: string;
    root: string;
    workspaceName: string;
};

/**
 * Leaves `root` as a repo holding one workspace, and answers with both. Mandor opens with
 * somewhere to work: asking for a repository before showing the app is asking the user to
 * decide something nothing has told them about yet. A remote is a later choice, never this one.
 *
 * One app, one repo: whatever workspace the repo holds is the workspace of this app, whatever
 * its kind says. Every step is idempotent, so this runs on every boot and needs no flag to
 * remember that it already ran. What it finds is adopted, never rewritten: a second start
 * reads the first one.
 */
export async function ensureLocalRepo(request: LocalRepoRequest): Promise<LocalRepo> {
    await layOut(request);

    const read = await readOrThrow(repoFile(request.root), parseRepo);
    const listed = await listWorkspaces(request.root, read.value.workspaces);
    const existing = listed.workspaces.at(0);

    if (existing !== undefined) {
        return { repo: read.value, workspace: existing };
    }

    return { repo: read.value, workspace: await addWorkspace(request) };
}

/**
 * The two halves of a repo, each one guarded by what it writes. They are separate because a
 * directory can hold one without the other: a user who copied the tree in has no git yet.
 */
async function layOut(request: LocalRepoRequest): Promise<void> {
    const laid = await exists(repoFile(request.root));

    if (!laid) {
        await writeRepoTree(request.root, request.name);
    }

    const versioned = await exists(join(request.root, GIT_DIR));

    if (!versioned) {
        await initGitRepo(request.root);
    }
}

async function addWorkspace(request: LocalRepoRequest): Promise<Workspace> {
    const workspace = await createWorkspace(request.root, {
        id: newId(),
        name: request.workspaceName,
        kind: request.kind,
    });
    const message = commitMessage({ kind: 'create-workspace', name: workspace.name });

    await commitAll(request.root, message);

    return workspace;
}

function exists(path: string): Promise<boolean> {
    return stat(path).then(
        () => true,
        () => false,
    );
}
