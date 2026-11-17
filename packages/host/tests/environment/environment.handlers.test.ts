import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initRepo, status } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Environment } from '@mandor/schema';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerEnvironmentHandlers } from '../../src/environment/environment.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { readSecret } from '../../src/origin/secret-store.js';
import { readSecretIndex } from '../../src/secret/secret-index.js';
import { silentReporting, spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let userData: string;
let prodId: string;

/** The key of the token in the store of the system: the origin, workspace and environment ids. */
function tokenKey(): string {
    return `local/pagos/${prodId}/TOKEN`;
}

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });
    await initRepo(root);
});

beforeEach(async () => {
    keychain.available = true;
    root = await freshRepo();
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    ipc = spyIpc();
    dispose = registerEnvironmentHandlers(ipc, { userDataDir: userData, ...silentReporting() });

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });

    const created = await create({ workspaceId: 'pagos', name: 'Prod' });

    if (!created.ok) {
        throw new Error('the environment was not created');
    }

    prodId = created.value.id;
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

function create(payload: unknown): Promise<Result<Environment>> {
    return ipc.call(CHANNELS.environmentCreate, payload) as Promise<Result<Environment>>;
}

function update(payload: unknown): Promise<Result<Environment>> {
    return ipc.call(CHANNELS.environmentUpdate, payload) as Promise<Result<Environment>>;
}

function declareToken(): Promise<Result<Environment>> {
    return update({
        workspaceId: 'pagos',
        environmentId: prodId,
        changes: {
            variables: [{ name: 'TOKEN', value: 'abc123', enabled: true, secret: true }],
        },
    });
}

function environmentText(): Promise<string> {
    return readFile(join(root, 'workspaces', 'pagos', 'environments', `${prodId}.yaml`), 'utf8');
}

describe('updating an environment that declares a secret', () => {
    /** The whole point of the plan, seen from the outside: the repo never holds the value. */
    it('keeps the value on this machine and writes a file without it', async () => {
        await declareToken();

        await expect(environmentText()).resolves.not.toContain('abc123');
        await expect(readSecret(userData, tokenKey())).resolves.toBe('abc123');
        await expect(readSecretIndex(root)).resolves.toEqual([tokenKey()]);
    });

    /** Without a keyring the value lasts the session: the next run must not think it is kept. */
    it('holds the value in memory on a machine with no keychain, and indexes nothing', async () => {
        keychain.available = false;

        await declareToken();

        await expect(environmentText()).resolves.not.toContain('abc123');
        await expect(readSecret(userData, tokenKey())).resolves.toBe('abc123');
        await expect(readSecretIndex(root)).resolves.toEqual([]);
    });

    /** What comes back is what was written, so the renderer never holds a value main hid. */
    it('answers with the variable already emptied', async () => {
        await expect(declareToken()).resolves.toMatchObject({
            ok: true,
            value: {
                variables: [{ name: 'TOKEN', value: '', enabled: true, secret: true }],
            },
        });
    });

    it('leaves nothing pending in the repo', async () => {
        await declareToken();
        await flushAllCommits();

        await expect(status(root)).resolves.toMatchObject({ clean: true });
    });

    it('writes a variable that is not secret as it came', async () => {
        await update({
            workspaceId: 'pagos',
            environmentId: prodId,
            changes: {
                variables: [{ name: 'HOST', value: 'localhost', enabled: true, secret: false }],
            },
        });

        await expect(environmentText()).resolves.toContain('localhost');
    });
});
