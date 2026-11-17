import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerAuthHandlers } from '../../src/auth/auth.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

const WORKSPACE = 'api-de-pagos';

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));
    ipc = spyIpc();
    dispose = registerAuthHandlers(ipc);

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

async function writeWorkspaceYaml(contents: string): Promise<void> {
    const file = join(root, 'workspaces', WORKSPACE, 'workspace.yaml');

    await writeFile(file, contents, 'utf8');
}

describe('the auth handlers of the host', () => {
    it('reads the auth of the workspace, or null when the file says nothing', async () => {
        await writeWorkspaceYaml(
            'name: API de pagos\nkind: async\nid: api-de-pagos\nauth:\n  type: none\n',
        );

        await expect(ipc.call(CHANNELS.authRead, { workspaceId: WORKSPACE })).resolves.toEqual({
            ok: true,
            value: { auth: { type: 'none' } },
        });
    });

    it('writes the auth of the workspace and the file keeps what it already said', async () => {
        await writeWorkspaceYaml('# pagos\nname: API de pagos\nkind: async\nid: api-de-pagos\n');

        await expect(
            ipc.call(CHANNELS.authWrite, {
                workspaceId: WORKSPACE,
                auth: { type: 'basic', username: 'u', password: 'p' },
            }),
        ).resolves.toEqual({ ok: true, value: {} });

        const written = await readFile(
            join(root, 'workspaces', WORKSPACE, 'workspace.yaml'),
            'utf8',
        );

        expect(written).toContain('# pagos');
        expect(written).toContain('type: basic');
    });

    it('refuses a folder: its auth goes with the rest of its settings', async () => {
        await expect(
            ipc.call(CHANNELS.authRead, {
                workspaceId: WORKSPACE,
                place: { kind: 'folder', path: 'pedidos' },
            }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        await expect(
            ipc.call(CHANNELS.authWrite, {
                workspaceId: WORKSPACE,
                place: { kind: 'folder', path: 'pedidos' },
                auth: null,
            }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
