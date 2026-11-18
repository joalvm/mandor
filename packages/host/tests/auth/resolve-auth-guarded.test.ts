import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, readFolderChain, writeRepoTree } from '@mandor/store-fs';
import { composeScope } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

import { resolveAuth } from '../../src/auth/resolve-auth.js';
import { forgetSessionSecrets, sessionSecrets } from '../../src/secret/session-secrets.js';
import { DIRECT_NETWORK } from '../support/direct-network.js';
import { startTokenServer } from './oauth/fake-token-server.js';

const WORKSPACE = 'api-de-pagos';

let root: string;

beforeEach(async () => {
    forgetSessionSecrets();
    root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: WORKSPACE, name: 'API de pagos', kind: 'async' });
});

afterEach(async () => {
    forgetSessionSecrets();

    await rm(root, { recursive: true, force: true });
});

async function workspaceAuth(lines: string[]): Promise<void> {
    await writeFile(
        join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
        ['name: API de pagos', 'kind: async', `id: ${WORKSPACE}`, 'auth:', ...lines, ''].join('\n'),
        'utf8',
    );
}

const OAUTH = [
    '  type: oauth2-client-credentials',
    '  tokenUrl: "{{idp}}/token"',
    '  clientId: client',
    '  clientSecret: "{{secret}}"',
    '  clientAuth: basic',
];

async function base(): Promise<Omit<Parameters<typeof resolveAuth>[0], 'scope' | 'tokens'>> {
    return {
        root,
        workspaceId: WORKSPACE,
        own: undefined,
        chain: await readFolderChain(root, WORKSPACE, null),
        environmentId: 'staging',
    };
}

const BEARER_SCOPE = composeScope({ environment: { token: 's3cret' }, secret: ['token'] });

describe('resolveAuth for a send a script shaped', () => {
    it('says a marked variable went in, and nothing for a credential written by hand', async () => {
        await workspaceAuth(['  type: bearer', '  token: "{{token}}"']);

        await expect(
            resolveAuth({ ...(await base()), scope: BEARER_SCOPE, networkFor: DIRECT_NETWORK }),
        ).resolves.toMatchObject({ carriesSecret: true });

        await workspaceAuth(['  type: bearer', '  token: by-hand']);

        await expect(
            resolveAuth({ ...(await base()), scope: BEARER_SCOPE, networkFor: DIRECT_NETWORK }),
        ).resolves.toMatchObject({ carriesSecret: false });
    });

    it('leaves a marked variable as its name with secrets off, and remembers nothing', async () => {
        await workspaceAuth(['  type: bearer', '  token: "{{token}}"']);

        const resolved = await resolveAuth({
            ...(await base()),
            scope: BEARER_SCOPE,
            secretsOff: true,
            networkFor: DIRECT_NETWORK,
        });

        expect(resolved.parts.headers).toEqual([['Authorization', 'Bearer {{token}}']]);
        expect(resolved.carriesSecret).toBe(false);
        expect(sessionSecrets()).toEqual([]);
    });

    it('asks no endpoint and sends no token with tokens none', async () => {
        const server = await startTokenServer(() => ({
            body: { access_token: 'granted', token_type: 'Bearer', expires_in: 60 },
        }));

        try {
            await workspaceAuth(OAUTH);

            const resolved = await resolveAuth({
                ...(await base()),
                scope: composeScope({
                    environment: { idp: server.origin, secret: 's3cret' },
                    secret: ['secret'],
                }),
                tokens: 'none',
            });

            expect(resolved.parts.headers).toEqual([]);
            expect(server.requests).toHaveLength(0);
        } finally {
            await server.close();
        }
    });

    /** The token endpoint is the one place a secret travels to another URL. */
    it('resolves an OAuth2 level with the scope without scripts, and counts its token', async () => {
        const server = await startTokenServer(() => ({
            body: { access_token: 'granted', token_type: 'Bearer', expires_in: 60 },
        }));
        const environment = { idp: server.origin, secret: 's3cret' };

        try {
            await workspaceAuth(OAUTH);

            const resolved = await resolveAuth({
                ...(await base()),
                scope: composeScope({
                    script: { idp: 'http://127.0.0.1:9' },
                    environment,
                    secret: ['secret'],
                }),
                oauthScope: composeScope({ environment, secret: ['secret'] }),
                networkFor: DIRECT_NETWORK,
            });

            expect(resolved.parts.headers).toEqual([['Authorization', 'Bearer granted']]);
            expect(resolved.carriesSecret).toBe(true);
            expect(server.requests).toHaveLength(1);
        } finally {
            await server.close();
        }
    });
});
