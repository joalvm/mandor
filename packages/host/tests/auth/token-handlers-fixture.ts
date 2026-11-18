import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach } from 'vitest';

import { registerAuthTokenHandlers } from '../../src/auth/auth-token.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { forgetSessionSecrets } from '../../src/secret/session-secrets.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { startTokenServer, type FakeTokenServer } from './oauth/fake-token-server.js';
import { DIRECT_NETWORK } from '../support/direct-network.js';

const WORKSPACE = 'api-de-pagos';

export const PLACE = { workspaceId: WORKSPACE, environmentId: null, parentPath: null };

export type TokenHandlersContext = {
    ipc: IpcSpy;
    dispose: () => void;
    root: string;
    server: FakeTokenServer;
};

/** A repo with one workspace, a fake provider and the handlers registered, per test. */
export function useTokenHandlers(): TokenHandlersContext {
    const context = {} as TokenHandlersContext;

    beforeEach(async () => {
        forgetSessionSecrets();
        context.root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));
        context.server = await startTokenServer((request) => ({
            body: {
                access_token: 'the-access-token',
                token_type: 'Bearer',
                expires_in: 3600,
                ...(request.body.get('grant_type') === 'authorization_code'
                    ? { refresh_token: 'the-refresh-token' }
                    : {}),
            },
        }));
        context.ipc = spyIpc();
        context.dispose = registerAuthTokenHandlers(context.ipc, {
            userDataDir: context.root,
            networkFor: DIRECT_NETWORK,
        });

        await writeRepoTree(context.root, 'Demo');
        await createWorkspace(context.root, {
            id: 'api-de-pagos',
            name: 'API de pagos',
            kind: 'async',
        });
        setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: context.root });
    });

    afterEach(async () => {
        context.dispose();
        setActiveOrigin(null);
        await context.server.close();
        await rm(context.root, { recursive: true, force: true });
    });

    return context;
}

export async function writeAuth(root: string, lines: string[]): Promise<void> {
    await writeFile(
        join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
        ['name: API de pagos', 'kind: async', `id: ${WORKSPACE}`, 'auth:', ...lines, ''].join('\n'),
        'utf8',
    );
}

export function clientCredentials(server: FakeTokenServer): string[] {
    return [
        '  type: oauth2-client-credentials',
        `  tokenUrl: ${server.origin}/token`,
        '  clientId: client',
        '  clientSecret: s3cret',
        '  clientAuth: basic',
    ];
}
