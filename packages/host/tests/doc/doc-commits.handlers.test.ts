import { rm } from 'node:fs/promises';

import { initRepo } from '@mandor/git';
import { CHANNELS, type Channel, type Result } from '@mandor/ipc';
import { createWorkspace, writeRepoTree, readDoc } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerDocHandlers } from '../../src/doc/doc.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { commitCount, dirtyFiles, lastFiles, lastSubject } from '../support/repo-history.js';
import { copiedRepo } from '../support/copied-repo.js';

const WORKSPACE = { workspaceId: 'api-de-pagos' };
const DOCS = 'workspaces/api-de-pagos/docs';

/** What main draws for the file of a doc: twelve characters of the id alphabet, never the title. */
const MINTED = /^[0-9a-z]{12}\.md$/;

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
    await initRepo(root);
});

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerDocHandlers(ipc);

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

function call(channel: Channel, payload: unknown): Promise<Result<unknown>> {
    return ipc.call(channel, payload) as Promise<Result<unknown>>;
}

/** The file main drew for a doc it was asked to make under a title. */
async function created(title: string): Promise<string> {
    const made = await call(CHANNELS.docCreate, { ...WORKSPACE, title });

    return made.ok ? String(made.value) : '';
}

describe('what the docs leave in the history', () => {
    it('commits a created doc in the act, under its title and in a file of its own', async () => {
        const name = await created('Notas');

        expect(name).toMatch(MINTED);
        await expect(lastSubject(root)).resolves.toBe('create doc Notas');
        await expect(lastFiles(root)).resolves.toEqual([`${DOCS}/${name}`]);
        await expect(dirtyFiles(root)).resolves.toEqual([]);
    });

    it('commits a retitled doc as the one file that holds the title', async () => {
        const name = await created('Notas');

        await call(CHANNELS.docRename, { ...WORKSPACE, name, title: 'Ideas' });

        await expect(lastSubject(root)).resolves.toBe('rename doc Ideas');
        await expect(lastFiles(root)).resolves.toEqual([`${DOCS}/${name}`]);
        expect(await readDoc(root, WORKSPACE.workspaceId, name)).toBe('---\ntitle: Ideas\n---\n');
    });

    it('commits a deleted doc under the title it had', async () => {
        const name = await created('Notas');

        await call(CHANNELS.docDelete, { ...WORKSPACE, name });

        await expect(lastSubject(root)).resolves.toBe('delete doc Notas');
        await expect(lastFiles(root)).resolves.toEqual([`${DOCS}/${name}`]);
    });

    it('waits for the calm before committing what was typed', async () => {
        const name = await created('Notas');
        const before = await commitCount(root);

        await call(CHANNELS.docWrite, { ...WORKSPACE, name, text: 'uno\n' });
        await call(CHANNELS.docWrite, { ...WORKSPACE, name, text: 'dos\n' });

        await expect(commitCount(root)).resolves.toBe(before);

        await flushAllCommits();

        await expect(commitCount(root)).resolves.toBe(before + 1);
        await expect(lastSubject(root)).resolves.toBe('update doc Notas');
        expect(await readDoc(root, WORKSPACE.workspaceId, name)).toBe(
            '---\ntitle: Notas\n---\ndos\n',
        );
    });

    it('drops the edit waiting for its calm when the doc is reverted', async () => {
        const name = await created('Notas');

        await call(CHANNELS.docWrite, { ...WORKSPACE, name, text: 'un desastre\n' });

        const before = await commitCount(root);
        const reverted = await call(CHANNELS.docRevert, { ...WORKSPACE, name });

        await flushAllCommits();

        expect(reverted).toEqual({ ok: true, value: '' });
        expect(await readDoc(root, WORKSPACE.workspaceId, name)).toBe('---\ntitle: Notas\n---\n');
        await expect(commitCount(root)).resolves.toBe(before);
        await expect(dirtyFiles(root)).resolves.toEqual([]);
    });
});
