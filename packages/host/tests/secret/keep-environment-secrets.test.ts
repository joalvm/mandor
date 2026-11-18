import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readSecret } from '../../src/origin/secret-store.js';
import { environmentSecretKey } from '../../src/secret/environment-secret-key.js';
import {
    keepEnvironmentSecrets,
    keepSecretsAt,
} from '../../src/secret/keep-environment-secrets.js';
import { readSecretIndex } from '../../src/secret/secret-index.js';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

let userData: string;
let root: string;

const PLACE = { repo: 'team', workspaceId: 'payments', environmentId: 'prod' };

beforeEach(async () => {
    keychain.available = true;
    userData = await mkdtemp(join(tmpdir(), 'mandor-keep-user-'));
    root = await mkdtemp(join(tmpdir(), 'mandor-keep-repo-'));

    await writeRepoTree(root, 'Team');
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
});

describe('keeping the secrets of an environment', () => {
    it('hands every value to the keychain under the key of its environment', async () => {
        const keep = keepEnvironmentSecrets({ userDataDir: userData, root, place: PLACE });

        await keep([
            { name: 'TOKEN', value: 'tok_1' },
            { name: 'KEY', value: 'key_2' },
        ]);

        await expect(readSecret(userData, environmentSecretKey(PLACE, 'TOKEN'))).resolves.toBe(
            'tok_1',
        );
        await expect(readSecret(userData, environmentSecretKey(PLACE, 'KEY'))).resolves.toBe(
            'key_2',
        );
    });

    it('writes down in the index of the repo that each name has a value here', async () => {
        const keep = keepEnvironmentSecrets({ userDataDir: userData, root, place: PLACE });

        await keep([{ name: 'TOKEN', value: 'tok_1' }]);

        expect(await readSecretIndex(root)).toEqual([environmentSecretKey(PLACE, 'TOKEN')]);
    });

    it('does not name a value in the index, only its key', async () => {
        const keep = keepEnvironmentSecrets({ userDataDir: userData, root, place: PLACE });

        await keep([{ name: 'TOKEN', value: 'tok_1' }]);

        expect(JSON.stringify(await readSecretIndex(root))).not.toContain('tok_1');
    });

    it('keeps the secrets of other environments apart', async () => {
        const other = { ...PLACE, environmentId: 'local' };

        await keepEnvironmentSecrets({ userDataDir: userData, root, place: PLACE })([
            { name: 'TOKEN', value: 'prod-token' },
        ]);
        await keepEnvironmentSecrets({ userDataDir: userData, root, place: other })([
            { name: 'TOKEN', value: 'local-token' },
        ]);

        await expect(readSecret(userData, environmentSecretKey(PLACE, 'TOKEN'))).resolves.toBe(
            'prod-token',
        );
        await expect(readSecret(userData, environmentSecretKey(other, 'TOKEN'))).resolves.toBe(
            'local-token',
        );
    });
});

describe('keeping the secrets of any file', () => {
    it('files each name under the key the caller derives for it', async () => {
        const keep = keepSecretsAt({
            userDataDir: userData,
            root,
            keyOf: (name) => `globals/${name}`,
        });

        await keep([{ name: 'API', value: 'api_1' }]);

        await expect(readSecret(userData, 'globals/API')).resolves.toBe('api_1');
        expect(await readSecretIndex(root)).toEqual(['globals/API']);
    });

    /** Without a keychain the value waits in memory: the machine has no value on disk to point at. */
    it('keeps the value out of the index when the system has no keychain', async () => {
        keychain.available = false;

        const keep = keepSecretsAt({ userDataDir: userData, root, keyOf: (name) => `g/${name}` });

        await keep([{ name: 'API', value: 'api_1' }]);

        expect(await readSecretIndex(root)).toEqual([]);
    });

    it('does nothing for an empty list', async () => {
        const keep = keepSecretsAt({ userDataDir: userData, root, keyOf: (name) => name });

        await keep([]);

        expect(await readSecretIndex(root)).toEqual([]);
    });
});
