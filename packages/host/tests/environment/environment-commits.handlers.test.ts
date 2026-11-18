import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initRepo } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Environment } from '@mandor/schema';
import { createWorkspace, readEnvironment, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerEnvironmentHandlers } from '../../src/environment/environment.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { silentReporting, spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { commitCount, dirtyFiles, lastFiles, lastSubject } from '../support/repo-history.js';
import { copiedRepo } from '../support/copied-repo.js';

const SCOPE = { workspaceId: 'pagos' };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let userData: string;

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
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

/** The file of an environment: named by the id main minted, not by what the user called it. */
function environmentFileOf(id: string): string {
    return `workspaces/pagos/environments/${id}.yaml`;
}

/** Creates an environment through the channel and returns the id main minted for it. */
async function createdId(name: string): Promise<string> {
    const created = (await ipc.call(CHANNELS.environmentCreate, {
        ...SCOPE,
        name,
    })) as Result<Environment>;

    if (!created.ok) {
        throw new Error('the environment was not created');
    }

    return created.value.id;
}

describe('what the environments leave in the history', () => {
    it('commits a created environment as its own file, in the act', async () => {
        const id = await createdId('Prod');

        await expect(lastSubject(root)).resolves.toBe('create environment Prod');
        await expect(lastFiles(root)).resolves.toEqual([environmentFileOf(id)]);
        await expect(dirtyFiles(root)).resolves.toEqual([]);
    });

    it('commits an edit once the calm comes, and only the environment that changed', async () => {
        const id = await createdId('Prod');
        const before = await commitCount(root);
        const variables = [{ name: 'HOST', value: 'localhost', enabled: true, secret: false }];

        await ipc.call(CHANNELS.environmentUpdate, {
            ...SCOPE,
            environmentId: id,
            changes: { variables },
        });

        await expect(commitCount(root)).resolves.toBe(before);

        await flushAllCommits();

        await expect(lastSubject(root)).resolves.toBe('update environment Prod');
        await expect(lastFiles(root)).resolves.toEqual([environmentFileOf(id)]);
    });

    it('lands two saves sent in a row in the order they were sent', async () => {
        const id = await createdId('Prod');
        const variablesOf = (value: string) => [
            { name: 'HOST', value, enabled: true, secret: false },
        ];

        await Promise.all([
            ipc.call(CHANNELS.environmentUpdate, {
                ...SCOPE,
                environmentId: id,
                changes: { variables: variablesOf('first') },
            }),
            ipc.call(CHANNELS.environmentUpdate, {
                ...SCOPE,
                environmentId: id,
                changes: { name: 'Staging', variables: variablesOf('last') },
            }),
        ]);

        await expect(readEnvironment(root, 'pagos', id)).resolves.toMatchObject({
            name: 'Staging',
            variables: [{ value: 'last' }],
        });
    });

    it('commits a deleted environment in the act', async () => {
        const id = await createdId('Prod');

        await ipc.call(CHANNELS.environmentDelete, { ...SCOPE, environmentId: id });

        await expect(lastSubject(root)).resolves.toBe('delete environment Prod');
        await expect(lastFiles(root)).resolves.toEqual([environmentFileOf(id)]);
        await expect(dirtyFiles(root)).resolves.toEqual([]);
    });
});
