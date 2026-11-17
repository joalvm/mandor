import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initRepo } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Environment } from '@mandor/schema';
import { createWorkspace, writeRepoTree, listConflicts } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerEnvironmentHandlers } from '../../src/environment/environment.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { silentReporting, spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

const SCOPE = { workspaceId: 'pagos' };
const HOST = { name: 'HOST', value: 'localhost', enabled: true, secret: false };
const TOKEN = { name: 'TOKEN', value: 'clear-value', enabled: true, secret: true };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let userData: string;
let file: string;
let prodId: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });
    await initRepo(root);
});

beforeEach(async () => {
    root = await freshRepo();
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    ipc = spyIpc();
    dispose = registerEnvironmentHandlers(ipc, { userDataDir: userData, ...silentReporting() });

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });

    const created = (await ipc.call(CHANNELS.environmentCreate, {
        ...SCOPE,
        name: 'Prod',
    })) as Result<Environment>;

    if (!created.ok) {
        throw new Error('the environment was not created');
    }

    prodId = created.value.id;
    file = join(root, 'workspaces', 'pagos', 'environments', `${prodId}.yaml`);

    await ipc.call(CHANNELS.environmentList, SCOPE);
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

function edit(changes: unknown): Promise<unknown> {
    return ipc.call(CHANNELS.environmentUpdate, { ...SCOPE, environmentId: prodId, changes });
}

describe('updating an environment the window listed before the file changed', () => {
    it('keeps their change in a key the window did not touch', async () => {
        await writeFile(file, `${await readFile(file, 'utf8')}other-app: 1\n`);

        await edit({ variables: [HOST] });

        const written = await readFile(file, 'utf8');

        expect(written).toContain('other-app: 1');
        expect(written).toContain('localhost');
        expect((await listConflicts(root)).conflicts).toEqual([]);
    });

    it('keeps the window version and records the clash on the same field', async () => {
        await writeFile(file, (await readFile(file, 'utf8')).replace('name: Prod', 'name: Ellos'));

        await edit({ name: 'Mio' });

        const { conflicts } = await listConflicts(root);

        expect(await readFile(file, 'utf8')).toContain('name: Mio');
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]?.record.theirs).toContain('name: Ellos');
    });

    it('leaves the value of a secret out of the file and out of the record', async () => {
        await writeFile(file, (await readFile(file, 'utf8')).replace('name: Prod', 'name: Ellos'));

        await edit({ name: 'Mio', variables: [TOKEN] });

        const { conflicts } = await listConflicts(root);

        expect(await readFile(file, 'utf8')).not.toContain('clear-value');
        expect(JSON.stringify(conflicts)).not.toContain('clear-value');
    });
});
