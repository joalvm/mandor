import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

import { forgetToken, writeToken } from '../../../src/auth/oauth/token-cache.js';
import { tokenKeyOfAuth } from '../../../src/auth/oauth/token-key.js';
import { tokenStatusOf } from '../../../src/auth/oauth/token-status.js';

const AUTH = {
    type: 'oauth2-client-credentials' as const,
    tokenUrl: 'https://idp.example.com/token',
    clientId: 'client',
    clientSecret: 's3cret',
    clientAuth: 'basic' as const,
};
const KEY = tokenKeyOfAuth(AUTH, 'api-pagos', null);

let root: string;

beforeEach(async () => {
    keychain.available = true;
    root = await mkdtemp(join(tmpdir(), 'mandor-status-'));
});

afterEach(async () => {
    await forgetToken(root, KEY);
    await rm(root, { recursive: true, force: true });
});

describe('tokenStatusOf', () => {
    it('says none when nothing was filed', async () => {
        await expect(tokenStatusOf(root, AUTH, 'api-pagos', null)).resolves.toEqual({
            state: 'none',
            expiresAt: null,
        });
    });

    it('says valid, with the moment it stops, for a token that still serves', async () => {
        const expiresAt = Date.now() + 60_000;

        await writeToken(root, KEY, { accessToken: 'secret-value', expiresAt });

        const status = await tokenStatusOf(root, AUTH, 'api-pagos', null);

        expect(status).toEqual({ state: 'valid', expiresAt: new Date(expiresAt).toISOString() });
        expect(JSON.stringify(status)).not.toContain('secret-value');
    });

    it('says expired for a token past its moment', async () => {
        await writeToken(root, KEY, { accessToken: 'old', expiresAt: Date.now() - 1000 });

        await expect(tokenStatusOf(root, AUTH, 'api-pagos', null)).resolves.toMatchObject({
            state: 'expired',
        });
    });

    it('says memory-only when the machine has no keychain to file it in', async () => {
        keychain.available = false;

        await writeToken(root, KEY, { accessToken: 'held', expiresAt: Date.now() + 60_000 });

        await expect(tokenStatusOf(root, AUTH, 'api-pagos', null)).resolves.toMatchObject({
            state: 'memory-only',
        });
    });

    it('does not look at the token of another environment', async () => {
        await writeToken(root, KEY, { accessToken: 'mine', expiresAt: Date.now() + 60_000 });

        await expect(tokenStatusOf(root, AUTH, 'api-pagos', 'prod')).resolves.toMatchObject({
            state: 'none',
        });
    });
});
