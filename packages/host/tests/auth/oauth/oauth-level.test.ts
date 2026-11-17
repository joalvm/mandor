import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeRepoTree, writeGlobals } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { oauthLevelOf } from '../../../src/auth/oauth/oauth-level.js';

const WORKSPACE = 'api-de-pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-level-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function place() {
    return { root, repo: 'local', readSecret: () => Promise.resolve(null) };
}

const input = { workspaceId: WORKSPACE, environmentId: null, parentPath: null };

async function writeWorkspaceAuth(lines: string[]): Promise<void> {
    await writeFile(
        join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
        ['name: API de pagos', 'kind: async', `id: ${WORKSPACE}`, 'auth:', ...lines, ''].join('\n'),
        'utf8',
    );
}

describe('oauthLevelOf', () => {
    it('finds the OAuth2 level of the workspace when nothing closer decides', async () => {
        await writeWorkspaceAuth([
            '  type: oauth2-client-credentials',
            '  tokenUrl: https://idp.example.com/token',
            '  clientId: client',
            '  clientSecret: s3cret',
            '  clientAuth: basic',
        ]);

        await expect(oauthLevelOf(place(), { ...input, own: undefined })).resolves.toMatchObject({
            type: 'oauth2-client-credentials',
            clientId: 'client',
        });
    });

    it('lets the level of the editor rule over the workspace', async () => {
        await writeWorkspaceAuth(['  type: none']);

        const own = {
            type: 'oauth2-code-pkce' as const,
            authorizationUrl: 'https://idp.example.com/authorize',
            tokenUrl: 'https://idp.example.com/token',
            clientId: 'draft',
        };

        await expect(oauthLevelOf(place(), { ...input, own })).resolves.toMatchObject({
            type: 'oauth2-code-pkce',
            clientId: 'draft',
        });
    });

    it('is null where what rules is not an OAuth2 scheme', async () => {
        await writeWorkspaceAuth(['  type: none']);

        await expect(oauthLevelOf(place(), { ...input, own: undefined })).resolves.toBeNull();
    });

    it('resolves the templates of the level against the globals of the origin', async () => {
        await writeWorkspaceAuth([
            '  type: oauth2-client-credentials',
            '  tokenUrl: https://{{idp}}/token',
            '  clientId: client',
            '  clientSecret: s3cret',
            '  clientAuth: basic',
        ]);
        await writeGlobals(root, {
            variables: [{ name: 'idp', value: 'idp.example.com', enabled: true, secret: false }],
        });

        await expect(oauthLevelOf(place(), { ...input, own: undefined })).resolves.toMatchObject({
            tokenUrl: 'https://idp.example.com/token',
        });
    });
});
