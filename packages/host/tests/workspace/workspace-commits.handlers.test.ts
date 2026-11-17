import { rm } from 'node:fs/promises';

import { initRepo } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Workspace } from '@mandor/schema';
import { writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { registerWorkspaceHandlers } from '../../src/workspace/workspace.handlers.js';
import { dirtyFiles, lastFiles, lastSubject } from '../support/repo-history.js';
import { copiedRepo } from '../support/copied-repo.js';

/** The file a workspace lives in: its folder is the id main minted, never its name. */
function workspaceFileOf(id: string): string {
    return `workspaces/${id}/workspace.yaml`;
}

/** Creates a workspace through the channel and returns the id main minted for it. */
async function createdId(name: string): Promise<string> {
    const created = (await ipc.call(CHANNELS.workspaceCreate, { name })) as Result<Workspace>;

    if (!created.ok) {
        throw new Error('the workspace was not created');
    }

    return created.value.id;
}

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await initRepo(root);
});

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerWorkspaceHandlers(ipc, { kind: 'sync' });

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

describe('what the workspaces leave in the history', () => {
    it('commits a created workspace with the repo file that lists it, in the act', async () => {
        const id = await createdId('Eventos');

        await expect(lastSubject(root)).resolves.toBe('create workspace Eventos');
        await expect(lastFiles(root)).resolves.toEqual(['mandor.yaml', workspaceFileOf(id)]);
        await expect(dirtyFiles(root)).resolves.toEqual([]);
    });

    it('commits a rename as the workspace file alone', async () => {
        const id = await createdId('Eventos');

        await ipc.call(CHANNELS.workspaceRename, { id, name: 'Sucesos' });

        await expect(lastSubject(root)).resolves.toBe('rename workspace Sucesos');
        await expect(lastFiles(root)).resolves.toEqual([workspaceFileOf(id)]);
    });

    it('commits a deleted workspace with the repo file that stopped listing it', async () => {
        const id = await createdId('Eventos');

        await ipc.call(CHANNELS.workspaceDelete, { id });

        await expect(lastSubject(root)).resolves.toBe('delete workspace Eventos');
        await expect(lastFiles(root)).resolves.toEqual(['mandor.yaml', workspaceFileOf(id)]);
        await expect(dirtyFiles(root)).resolves.toEqual([]);
    });
});
