import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { originAccess } from '../../src/origin/origin-access.js';
import { originSecretKey } from '../../src/origin/origin-secret-key.js';
import { storeSecret } from '../../src/origin/secret-store.js';
import type { StoredOrigin } from '../../src/origin/stored-origin.js';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

const TEAM: StoredOrigin = {
    id: 'team',
    kind: 'remote',
    name: 'Team',
    root: '/unused',
    url: 'https://git.example.test/org/team.git',
};

let userData: string;

beforeEach(async () => {
    keychain.available = true;
    userData = await mkdtemp(join(tmpdir(), 'mandor-access-'));
});

afterEach(async () => {
    await rm(userData, { force: true, recursive: true });
});

describe('what git needs to reach an origin', () => {
    it('is the address alone when the user kept no token', async () => {
        await expect(originAccess(userData, TEAM)).resolves.toEqual({ url: TEAM.url });
    });

    it('adds the token the store of the system keeps for that origin', async () => {
        await storeSecret(userData, originSecretKey('team'), 's3cret');

        await expect(originAccess(userData, TEAM)).resolves.toEqual({
            url: TEAM.url,
            token: 's3cret',
        });
    });

    it('does not take the token of another origin', async () => {
        await storeSecret(userData, originSecretKey('other'), 's3cret');

        await expect(originAccess(userData, TEAM)).resolves.toEqual({ url: TEAM.url });
    });

    it('goes without a token on a machine with no keychain', async () => {
        keychain.available = false;

        await expect(originAccess(userData, TEAM)).resolves.toEqual({ url: TEAM.url });
    });

    it('refuses an origin that has no address', async () => {
        const bare: StoredOrigin = { id: 'team', kind: 'remote', name: 'Team', root: '/unused' };

        await expect(originAccess(userData, bare)).rejects.toThrow('no address');
    });
});
