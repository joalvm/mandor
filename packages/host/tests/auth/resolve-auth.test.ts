import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, readFolderChain, writeRepoTree } from '@mandor/store-fs';
import type { AuthConfig } from '@mandor/schema';
import { composeScope } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

import { resolveAuth } from '../../src/auth/resolve-auth.js';
import { forgetSessionSecrets, sessionSecrets } from '../../src/secret/session-secrets.js';
import { startTokenServer } from './oauth/fake-token-server.js';
import { DIRECT_NETWORK } from '../support/direct-network.js';

const WORKSPACE = 'api-de-pagos';

let root: string;

beforeEach(async () => {
    forgetSessionSecrets();
    root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });

    await writeFile(
        join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
        'name: API de pagos\nkind: async\nid: api-de-pagos\nauth:\n  type: bearer\n  token: "{{token}}"\n',
        'utf8',
    );
});

afterEach(async () => {
    forgetSessionSecrets();

    await rm(root, { recursive: true, force: true });
});

function scope(): ReturnType<typeof composeScope> {
    return composeScope({ environment: { token: 's3cret' }, secret: ['token'] });
}

/** The auth of a request at the top of the collection, under the workspace written above. */
async function resolveOwn(own: AuthConfig | undefined): ReturnType<typeof resolveAuth> {
    return resolveAuth({
        root,
        workspaceId: WORKSPACE,
        own,
        chain: await readFolderChain(root, WORKSPACE, null),
        networkFor: DIRECT_NETWORK,
        scope: scope(),
        environmentId: null,
    });
}

describe('resolveAuth', () => {
    it('resolves the auth of the workspace into the parts the request applies', async () => {
        const { parts, from } = await resolveOwn(undefined);

        expect(parts.headers).toEqual([['Authorization', 'Bearer s3cret']]);
        expect(from).toBe(1);
    });

    it('remembers what it produced as a session secret', async () => {
        await resolveOwn(undefined);

        expect(sessionSecrets()).toContain('Bearer s3cret');
    });

    it('does not take a credential written by hand for a session secret', async () => {
        const { parts } = await resolveOwn({ type: 'bearer', token: 'written-by-hand' });

        expect(parts.headers).toEqual([['Authorization', 'Bearer written-by-hand']]);
        expect(sessionSecrets()).not.toContain('Bearer written-by-hand');
    });

    it('remembers as session secrets the credentials a signature works out on the send', async () => {
        const { parts } = await resolveOwn({
            type: 'awsv4',
            accessKeyId: 'AKID',
            secretAccessKey: '{{token}}',
            region: 'eu-west-1',
            sessionToken: 'temporary',
        });

        expect(parts.signing).toMatchObject({ scheme: 'awsv4', secretAccessKey: 's3cret' });
        expect(sessionSecrets()).toEqual(expect.arrayContaining(['AKID', 's3cret', 'temporary']));
        expect(sessionSecrets()).not.toContain('eu-west-1');
    });

    it('lets the auth of the item rule over the workspace', async () => {
        const { parts, from } = await resolveOwn({ type: 'none' });

        expect(parts.headers).toEqual([]);
        expect(from).toBe(0);
    });

    it('produces nothing and decides nothing when every level inherits', async () => {
        await writeFile(
            join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
            'name: API de pagos\nkind: async\nid: api-de-pagos\n',
            'utf8',
        );

        const { parts, from } = await resolveOwn({ inherit: true });

        expect(parts.headers).toEqual([]);
        expect(from).toBeNull();
    });

    it('obtains the token of an oauth2 level and applies it as a bearer header', async () => {
        const server = await startTokenServer(() => ({
            body: { access_token: 'granted', token_type: 'Bearer', expires_in: 60 },
        }));

        try {
            await writeFile(
                join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
                [
                    'name: API de pagos',
                    'kind: async',
                    'id: api-de-pagos',
                    'auth:',
                    '  type: oauth2-client-credentials',
                    '  tokenUrl: "{{idp}}/token"',
                    '  clientId: client',
                    '  clientSecret: "{{secret}}"',
                    '  clientAuth: basic',
                    '',
                ].join('\n'),
                'utf8',
            );

            const oauthScope = composeScope({
                environment: { idp: server.origin, secret: 's3cret' },
                secret: ['secret'],
            });
            const input = {
                root,
                workspaceId: WORKSPACE,
                own: undefined,
                chain: await readFolderChain(root, WORKSPACE, null),
                networkFor: DIRECT_NETWORK,
                scope: oauthScope,
                environmentId: 'staging',
            };
            const { parts } = await resolveAuth(input);

            await resolveAuth(input);

            expect(parts.headers).toEqual([['Authorization', 'Bearer granted']]);
            expect(server.requests).toHaveLength(1);
            expect(server.requests[0]?.headers.authorization).toBe(
                `Basic ${Buffer.from('client:s3cret').toString('base64')}`,
            );
            expect(sessionSecrets()).toContain('granted');
        } finally {
            await server.close();
        }
    });
});
