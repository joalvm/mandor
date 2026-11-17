import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

import { forgetSessionSecrets, sessionSecrets } from '../../../src/secret/session-secrets.js';
import { tokenKey } from '../../../src/auth/oauth/token-key.js';
import { forgetToken, readToken, writeToken } from '../../../src/auth/oauth/token-cache.js';
import { tokenFor } from '../../../src/auth/oauth/token-for.js';
import { startTokenServer, type FakeTokenServer } from './fake-token-server.js';

const WORKSPACE = 'api-de-pagos';

let root: string;
let server: FakeTokenServer;
let issued = 0;

beforeEach(async () => {
    keychain.available = true;
    issued = 0;
    forgetSessionSecrets();
    root = await mkdtemp(join(tmpdir(), 'mandor-token-for-'));
    server = await startTokenServer((request) => {
        issued += 1;

        return {
            body: {
                access_token: `token-${String(issued)}`,
                token_type: 'Bearer',
                expires_in: 3600,
                ...(request.body.get('grant_type') === 'refresh_token'
                    ? { refresh_token: 'rotated' }
                    : {}),
            },
        };
    });
});

afterEach(async () => {
    await forgetToken(root, keyOf());
    await server.close();
    await rm(root, { recursive: true, force: true });
});

function auth(tokenUrl = `${server.origin}/token`) {
    return {
        type: 'oauth2-client-credentials' as const,
        tokenUrl,
        clientId: 'client',
        clientSecret: 's3cret',
        clientAuth: 'basic' as const,
    };
}

function keyOf(environmentId: string | null = 'staging'): string {
    return tokenKey({
        flow: 'oauth2-client-credentials',
        tokenUrl: `${server.origin}/token`,
        clientId: 'client',
        workspaceId: WORKSPACE,
        environmentId,
    });
}

function input(environmentId: string | null = 'staging') {
    return { root, workspaceId: WORKSPACE, environmentId, auth: auth() };
}

describe('tokenFor', () => {
    it('asks for a token when there is none, and keeps it ciphered on disk', async () => {
        const token = await tokenFor(input());

        expect(token.accessToken).toBe('token-1');

        const files = await readdir(join(root, '.mandor', 'tokens'));
        const raw = await readFile(join(root, '.mandor', 'tokens', files[0] ?? ''), 'utf8');

        expect(files).toHaveLength(1);
        expect(raw).not.toContain('token-1');
    });

    it('serves the cache without asking again while the token is valid', async () => {
        await tokenFor(input());

        const again = await tokenFor(input());

        expect(again.accessToken).toBe('token-1');
        expect(server.requests).toHaveLength(1);
    });

    it('does not share a token between environments', async () => {
        await tokenFor(input('staging'));
        await tokenFor(input('prod'));

        expect(server.requests).toHaveLength(2);

        await forgetToken(root, keyOf('prod'));
    });

    it('renews with the refresh token when the cached one has expired', async () => {
        await writeToken(root, keyOf(), {
            accessToken: 'stale',
            refreshToken: 'the-refresh',
            expiresAt: Date.now() - 1000,
        });

        const token = await tokenFor(input());

        expect(token.accessToken).toBe('token-1');
        expect(server.requests[0]?.body.get('grant_type')).toBe('refresh_token');
        expect(server.requests[0]?.body.get('refresh_token')).toBe('the-refresh');
        expect(token.refreshToken).toBe('rotated');
    });

    it('treats a token about to expire as expired: it would die in flight', async () => {
        await writeToken(root, keyOf(), { accessToken: 'stale', expiresAt: Date.now() + 10_000 });

        expect((await tokenFor(input())).accessToken).toBe('token-1');
    });

    it('asks for a new grant when it expired and there is no refresh token', async () => {
        await writeToken(root, keyOf(), { accessToken: 'stale', expiresAt: Date.now() - 1000 });

        const token = await tokenFor(input());

        expect(token.accessToken).toBe('token-1');
        expect(server.requests[0]?.body.get('grant_type')).toBe('client_credentials');
    });

    it('falls back to a new grant when the refresh token is refused', async () => {
        await server.close();

        let calls = 0;

        server = await startTokenServer((request) => {
            calls += 1;

            return request.body.get('grant_type') === 'refresh_token'
                ? { status: 400, body: { error: 'invalid_grant' } }
                : { body: { access_token: 'granted', token_type: 'Bearer', expires_in: 60 } };
        });
        await writeToken(root, keyOf(), {
            accessToken: 'stale',
            refreshToken: 'revoked',
            expiresAt: Date.now() - 1000,
        });

        expect(
            (await tokenFor({ ...input(), auth: auth(`${server.origin}/token`) })).accessToken,
        ).toBe('granted');
        expect(calls).toBe(2);
    });

    it('refuses a scheme that is not http before any network or disk', async () => {
        await expect(
            tokenFor({ ...input(), auth: auth('file:///etc/passwd') }),
        ).rejects.toMatchObject({ code: 'auth-token-failed' });
        expect(await readdir(root)).not.toContain('.mandor');
    });

    it('holds the token in memory only on a machine without a keychain, and still serves it', async () => {
        keychain.available = false;

        await tokenFor(input());
        await tokenFor(input());

        expect(server.requests).toHaveLength(1);
        expect(await readdir(root)).not.toContain('.mandor');
        expect((await readToken(root, keyOf()))?.storage).toBe('memory');
    });

    it('remembers the token as a secret of the session, so no edge writes it out', async () => {
        await tokenFor(input());

        expect(sessionSecrets()).toContain('token-1');
    });
});
