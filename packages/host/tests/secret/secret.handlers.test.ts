import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../src/log/create-logger.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { readSecretIndex } from '../../src/secret/secret-index.js';
import { registerSecretHandlers } from '../../src/secret/secret.handlers.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

// case this suite has to be able to stand in for.
const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

const WHERE = { workspaceId: 'pagos', environmentId: 'prod' };
const KEY = 'local/pagos/prod/TOKEN';

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let userData: string;
let written: string[];
let logger: Logger;

beforeEach(async () => {
    keychain.available = true;
    written = [];
    logger = {
        log: (level, message) => written.push(`${level} ${message}`),
        flush: () => Promise.resolve(),
    };
    root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    ipc = spyIpc();
    dispose = registerSecretHandlers(ipc, { userDataDir: userData, logger });

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });
    await writeEnvironment(
        root,
        'pagos',
        createEnvironment({
            id: 'prod',
            name: 'Prod',
            variables: [
                { name: 'TOKEN', value: '', enabled: true, secret: true },
                { name: 'SPARE', value: '', enabled: true, secret: true },
                { name: 'HOST', value: 'localhost', enabled: true, secret: false },
            ],
        }),
    );
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

function set(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.secretSet, payload) as Promise<Result<Empty>>;
}

function clear(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.secretClear, payload) as Promise<Result<Empty>>;
}

function reveal(payload: unknown): Promise<Result<{ value: string | null }>> {
    return ipc.call(CHANNELS.secretReveal, payload) as Promise<Result<{ value: string | null }>>;
}

function kept(payload: unknown): Promise<Result<string[]>> {
    return ipc.call(CHANNELS.secretKept, payload) as Promise<Result<string[]>>;
}

describe('keeping a secret of an environment', () => {
    it('writes the value down under the four parts that name it', async () => {
        await expect(set({ ...WHERE, name: 'TOKEN', value: 'abc123' })).resolves.toEqual({
            ok: true,
            value: {},
        });
        await expect(readSecretIndex(root)).resolves.toEqual([KEY]);
    });

    /** A machine with no keyring holds the value until the app closes, and the next run asks. */
    it('holds the value for the session when the system offers no encryption', async () => {
        keychain.available = false;

        await expect(set({ ...WHERE, name: 'TOKEN', value: 'abc123' })).resolves.toEqual({
            ok: true,
            value: {},
        });
        await expect(reveal({ ...WHERE, name: 'TOKEN' })).resolves.toEqual({
            ok: true,
            value: { value: 'abc123' },
        });
        await expect(kept(WHERE)).resolves.toEqual({ ok: true, value: ['TOKEN'] });
        await expect(readSecretIndex(root)).resolves.toEqual([]);
    });

    it('refuses a request that names no variable', async () => {
        await expect(set({ ...WHERE, value: 'abc123' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('revealing a secret to the one who owns it', () => {
    it('gives one value back, the one that was asked for', async () => {
        await set({ ...WHERE, name: 'TOKEN', value: 'abc123' });

        await expect(reveal({ ...WHERE, name: 'TOKEN' })).resolves.toEqual({
            ok: true,
            value: { value: 'abc123' },
        });
    });

    /** A reveal is worth a line: the owner asked, and the log says which one and when. */
    it('writes the reveal down without writing the value down', async () => {
        await set({ ...WHERE, name: 'TOKEN', value: 'abc123' });
        await reveal({ ...WHERE, name: 'TOKEN' });

        expect(written.join('\n')).toContain('TOKEN');
        expect(written.join('\n')).not.toContain('abc123');
    });

    it('answers with nothing for a variable that has no value on this machine', async () => {
        await expect(reveal({ ...WHERE, name: 'TOKEN' })).resolves.toEqual({
            ok: true,
            value: { value: null },
        });
    });
});

describe('what this machine keeps', () => {
    it('names the secret variables that have a value here, and no value of any of them', async () => {
        await set({ ...WHERE, name: 'TOKEN', value: 'abc123' });

        await expect(kept(WHERE)).resolves.toEqual({ ok: true, value: ['TOKEN'] });
    });

    it('names none before anything was kept', async () => {
        await expect(kept(WHERE)).resolves.toEqual({ ok: true, value: [] });
    });
});

describe('taking a secret out', () => {
    it('leaves neither the value nor its entry in the index', async () => {
        await set({ ...WHERE, name: 'TOKEN', value: 'abc123' });

        await expect(clear({ ...WHERE, name: 'TOKEN' })).resolves.toEqual({ ok: true, value: {} });
        await expect(reveal({ ...WHERE, name: 'TOKEN' })).resolves.toEqual({
            ok: true,
            value: { value: null },
        });
        await expect(readSecretIndex(root)).resolves.toEqual([]);
    });

    /** A machine that lost its keyring still has to be able to stop keeping a secret. */
    it('works on a machine that can no longer encrypt', async () => {
        await set({ ...WHERE, name: 'TOKEN', value: 'abc123' });
        keychain.available = false;

        await expect(clear({ ...WHERE, name: 'TOKEN' })).resolves.toEqual({ ok: true, value: {} });
    });
});

describe('the disposer of the secret handlers', () => {
    it('leaves no channel of its own registered', () => {
        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
