import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerDefaultEnvironmentHandlers } from '../../src/environment/default-environment.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { tempRepo } from '../repo/support/temp-repo.js';

const repo = tempRepo();

let ipc: IpcSpy;
let dispose: () => void;

beforeEach(async () => {
    ipc = spyIpc();
    dispose = registerDefaultEnvironmentHandlers(ipc);

    await writeRepoTree(repo.root(), 'Demo');
    await createWorkspace(repo.root(), { id: 'pagos', name: 'Pagos', kind: 'sync' });
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: repo.root() });
});

afterEach(() => {
    dispose();
    setActiveOrigin(null);
});

describe('the default environment of a workspace', () => {
    it('reads none at first, then the one saved, in a commit of its own', async () => {
        await expect(
            ipc.call(CHANNELS.environmentDefaultLoad, { workspaceId: 'pagos' }),
        ).resolves.toEqual({ ok: true, value: { environmentId: null } });

        await ipc.call(CHANNELS.environmentDefaultSave, {
            workspaceId: 'pagos',
            environmentId: 'base',
        });
        await flushAllCommits();

        await expect(
            ipc.call(CHANNELS.environmentDefaultLoad, { workspaceId: 'pagos' }),
        ).resolves.toEqual({ ok: true, value: { environmentId: 'base' } });
        expect(
            await readFile(join(repo.root(), 'workspaces', 'pagos', 'workspace.yaml'), 'utf8'),
        ).toContain('defaultEnvironment: base');
        expect((await repo.subjects())[0]).toBe('set the default environment of workspace Pagos');
    });

    it('answers none for a workspace whose file does not load, and refuses a bad request', async () => {
        await expect(
            ipc.call(CHANNELS.environmentDefaultLoad, { workspaceId: 'nadie' }),
        ).resolves.toEqual({ ok: true, value: { environmentId: null } });
        await expect(
            ipc.call(CHANNELS.environmentDefaultSave, { workspaceId: 'pagos', environmentId: '' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
