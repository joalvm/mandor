import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { commitAll, initRepo } from '@mandor/git';
import { CHANNELS } from '@mandor/ipc';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerAuthHandlers } from '../../src/auth/auth.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { commitCount, lastFiles, lastSubject } from '../support/repo-history.js';
import { copiedRepo } from '../support/copied-repo.js';

const WORKSPACE = 'api-de-pagos';
const BASIC = { type: 'basic', username: 'u', password: 'p' };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
    await mkdir(join(root, 'workspaces', WORKSPACE, 'collections', 'pedidos'), { recursive: true });
    await writeFile(
        join(root, 'workspaces', WORKSPACE, 'collections', 'pedidos', 'collection.yaml'),
        'name: Pedidos\n',
        'utf8',
    );
    await initRepo(root);
    await commitAll(root, 'fixtures');
});

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerAuthHandlers(ipc);

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

function writeAuth(): Promise<unknown> {
    return ipc.call(CHANNELS.authWrite, { workspaceId: WORKSPACE, auth: BASIC });
}

describe('what writing auth leaves in the history', () => {
    it('commits the auth of the workspace in its file, once the calm comes', async () => {
        const before = await commitCount(root);

        await writeAuth();

        await expect(commitCount(root)).resolves.toBe(before);

        await flushAllCommits();

        await expect(lastSubject(root)).resolves.toBe('update auth API de pagos');
        await expect(lastFiles(root)).resolves.toEqual([`workspaces/${WORKSPACE}/workspace.yaml`]);
    });
});
