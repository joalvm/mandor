import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', async () => ({
    safeStorage: (await import('../../support/safe-storage-double.js')).safeStorageDouble(),
}));

import { forgetSessionSecrets } from '../../../src/secret/session-secrets.js';
import { forgetToken } from '../../../src/auth/oauth/token-cache.js';
import { tokenKey } from '../../../src/auth/oauth/token-key.js';
import { tokenFor } from '../../../src/auth/oauth/token-for.js';
import { startTokenServer, type FakeTokenServer } from './fake-token-server.js';

const WORKSPACE = 'api-de-pagos';

let root: string;
let server: FakeTokenServer;
let issued = 0;

beforeEach(async () => {
    issued = 0;
    forgetSessionSecrets();
    root = await mkdtemp(join(tmpdir(), 'mandor-token-pkce-'));
    server = await startTokenServer(() => {
        issued += 1;

        return {
            body: {
                access_token: `token-${String(issued)}`,
                token_type: 'Bearer',
                expires_in: 3600,
            },
        };
    });
});

afterEach(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
});

describe('tokenFor with the authorization code flow', () => {
    describe('authorization code with PKCE', () => {
        function pkce() {
            return {
                type: 'oauth2-code-pkce' as const,
                authorizationUrl: `${server.origin}/authorize`,
                tokenUrl: `${server.origin}/token`,
                clientId: 'client',
            };
        }

        function pkceKey(): string {
            return tokenKey({
                flow: 'oauth2-code-pkce',
                tokenUrl: `${server.origin}/token`,
                clientId: 'client',
                workspaceId: WORKSPACE,
                environmentId: 'staging',
            });
        }

        function browser(opened: string[]) {
            return async (raw: string): Promise<void> => {
                const url = new URL(raw);
                const back = new URL(url.searchParams.get('redirect_uri') ?? '');

                opened.push(raw);
                back.searchParams.set('code', 'the-code');
                back.searchParams.set('state', url.searchParams.get('state') ?? '');

                await fetch(back);
            };
        }

        afterEach(async () => {
            await forgetToken(root, pkceKey());
        });

        it('opens the browser once and serves the token from the cache afterwards', async () => {
            const opened: string[] = [];
            const base = { root, workspaceId: WORKSPACE, environmentId: 'staging', auth: pkce() };
            const first = await tokenFor({ ...base, openExternal: browser(opened) });
            const again = await tokenFor({ ...base, openExternal: browser(opened) });

            expect(first.accessToken).toBe('token-1');
            expect(again.accessToken).toBe('token-1');
            expect(opened).toHaveLength(1);
            expect(server.requests).toHaveLength(1);
        });

        it('makes two sends at the same time wait for one browser, not open two', async () => {
            const opened: string[] = [];
            const base = {
                root,
                workspaceId: WORKSPACE,
                environmentId: 'staging',
                auth: pkce(),
                openExternal: browser(opened),
            };
            const [one, two] = await Promise.all([tokenFor(base), tokenFor(base)]);

            expect(opened).toHaveLength(1);
            expect(one.accessToken).toBe(two.accessToken);
        });

        it('fails when the flow needs a browser and there is none', async () => {
            await expect(
                tokenFor({ root, workspaceId: WORKSPACE, environmentId: 'staging', auth: pkce() }),
            ).rejects.toMatchObject({ code: 'auth-token-failed' });
        });
    });
});
