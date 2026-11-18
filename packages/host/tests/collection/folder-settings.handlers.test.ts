import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerFolderSettingsHandlers } from '../../src/collection/folder-settings.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { knownText } from '../../src/repo/known-texts.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

const WORKSPACE = 'api-de-pagos';

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-repo-'));
    ipc = spyIpc();
    dispose = registerFolderSettingsHandlers(ipc);

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: WORKSPACE, name: 'API de pagos', kind: 'sync' });
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

async function writeTreeFile(path: string, contents: string): Promise<void> {
    const file = join(root, 'workspaces', WORKSPACE, 'collections', path);

    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, contents, 'utf8');
}

describe('the chain channel of the collections', () => {
    it('answers every level above a place with its settings, the workspace last', async () => {
        await writeTreeFile('pedidos/collection.yaml', 'name: Pedidos\n');
        await writeTreeFile(
            'pedidos/sub/folder.yaml',
            'name: Sub\nvariables:\n  - name: a\n    value: "1"\n    enabled: true\n    secret: false\n',
        );

        await expect(
            ipc.call(CHANNELS.collectionChain, {
                workspaceId: WORKSPACE,
                parentPath: 'pedidos/sub',
            }),
        ).resolves.toEqual({
            ok: true,
            value: [
                {
                    level: 'folder',
                    place: { kind: 'folder', path: 'pedidos/sub' },
                    name: 'Sub',
                    settings: {
                        variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
                    },
                },
                {
                    level: 'collection',
                    place: { kind: 'folder', path: 'pedidos' },
                    name: 'Pedidos',
                    settings: {},
                },
                {
                    level: 'workspace',
                    place: { kind: 'workspace' },
                    name: 'API de pagos',
                    settings: {},
                },
            ],
        });
    });

    /** A later write of the window is merged against what it was handed. */
    it('remembers the text of every file it hands the window', async () => {
        await writeTreeFile('pedidos/collection.yaml', '# a mano\nname: Pedidos\n');

        await ipc.call(CHANNELS.collectionChain, { workspaceId: WORKSPACE, parentPath: 'pedidos' });

        expect(knownText(root, `workspaces/${WORKSPACE}/collections/pedidos/collection.yaml`)).toBe(
            '# a mano\nname: Pedidos\n',
        );
        expect(knownText(root, `workspaces/${WORKSPACE}/workspace.yaml`)).toContain('API de pagos');
    });

    it('refuses a path made of anything but id segments', async () => {
        await expect(
            ipc.call(CHANNELS.collectionChain, { workspaceId: WORKSPACE, parentPath: '../x' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
