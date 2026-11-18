import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, readFolderChain, writeRepoTree } from '@mandor/store-fs';
import { composeScope, REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

import { resolveAuth } from '../../src/auth/resolve-auth.js';
import { forgetSessionSecrets } from '../../src/secret/session-secrets.js';
import { startTokenServer } from './oauth/fake-token-server.js';

const WORKSPACE = 'api-de-pagos';

let root: string;

beforeEach(async () => {
    forgetSessionSecrets();
    root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
});

afterEach(async () => {
    forgetSessionSecrets();

    await rm(root, { recursive: true, force: true });
});

describe('resolveAuth for a snippet', () => {
    it('does not ask for a token when the caller wants a placeholder', async () => {
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

            const { parts } = await resolveAuth({
                root,
                workspaceId: WORKSPACE,
                own: undefined,
                chain: await readFolderChain(root, WORKSPACE, null),
                scope: composeScope({
                    environment: { idp: server.origin, secret: 's3cret' },
                    secret: ['secret'],
                }),
                environmentId: 'staging',
                tokens: 'placeholder',
            });

            expect(parts.headers).toEqual([['Authorization', `Bearer ${REDACTED}`]]);
            expect(server.requests).toHaveLength(0);
        } finally {
            await server.close();
        }
    });
});
