import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readFolderChain } from '../../src/collection/read-folder-chain.js';
import { createWorkspace, writeRepoTree } from '../../src/index.js';
import { workspaceFile } from '../../src/workspace/workspace-path.js';

const WORKSPACE = 'api-de-pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'API de pagos', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function writeTreeFile(name: string, contents: string): Promise<void> {
    const path = join(root, 'workspaces', WORKSPACE, 'collections', name);

    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, contents, 'utf8');
}

function variable(name: string, value: string): object {
    return { name, value, enabled: true, secret: false };
}

describe('readFolderChain', () => {
    it('names the workspace last, with the auth its file carries', async () => {
        await writeTreeFile(
            '../workspace.yaml',
            'name: API de pagos\nkind: sync\nid: api-de-pagos\nauth:\n  type: bearer\n  token: "{{token}}"\n',
        );

        expect(await readFolderChain(root, WORKSPACE, null)).toEqual([
            {
                level: 'workspace',
                place: { kind: 'workspace' },
                name: 'API de pagos',
                settings: { auth: { type: 'bearer', token: '{{token}}' } },
            },
        ]);
    });

    it('reads three nested groups in one pass, the closest first, with their variables', async () => {
        const vars = (name: string, value: string): string =>
            `variables:\n  - name: ${name}\n    value: ${value}\n    enabled: true\n    secret: false\n`;

        await writeTreeFile('pagos/collection.yaml', `name: Pagos\n${vars('level', 'coleccion')}`);
        await writeTreeFile('pagos/altas/folder.yaml', `name: Altas\n${vars('level', 'carpeta')}`);
        await writeTreeFile(
            'pagos/altas/hoy/folder.yaml',
            `name: Hoy\nauth:\n  type: none\n${vars('level', 'subcarpeta')}`,
        );

        const chain = await readFolderChain(root, WORKSPACE, 'pagos/altas/hoy');

        expect(chain.map((level) => [level.level, level.name])).toEqual([
            ['folder', 'Hoy'],
            ['folder', 'Altas'],
            ['collection', 'Pagos'],
            ['workspace', 'API de pagos'],
        ]);
        expect(chain[0]?.settings).toEqual({
            auth: { type: 'none' },
            variables: [variable('level', 'subcarpeta')],
        });
        expect(chain[2]?.settings.variables).toEqual([variable('level', 'coleccion')]);
    });

    it('lets a broken folder in the middle enter empty, and says so', async () => {
        await writeTreeFile('pagos/collection.yaml', 'name: Pagos\n');
        await writeTreeFile('pagos/altas/folder.yaml', 'name: [\n');
        await writeTreeFile('pagos/altas/hoy/folder.yaml', 'name: Hoy\n');

        const chain = await readFolderChain(root, WORKSPACE, 'pagos/altas/hoy');

        expect(chain[1]).toEqual({
            level: 'folder',
            place: { kind: 'folder', path: 'pagos/altas' },
            name: 'altas',
            settings: {},
            unreadable: true,
        });
        expect(chain[0]?.name).toBe('Hoy');
        expect(chain[2]?.name).toBe('Pagos');
    });

    it('calls a group without a file like its directory, and it hands nothing down', async () => {
        await writeTreeFile('pagos/collection.yaml', 'name: Pagos\n');

        const chain = await readFolderChain(root, WORKSPACE, 'pagos/abril');

        expect(chain[0]).toEqual({
            level: 'folder',
            place: { kind: 'folder', path: 'pagos/abril' },
            name: 'abril',
            settings: {},
        });
    });

    it('treats the empty path as the top level, where only the workspace is above', async () => {
        const chain = await readFolderChain(root, WORKSPACE, '');

        expect(chain.map((level) => level.place)).toEqual([{ kind: 'workspace' }]);
    });

    it('lets an unreadable workspace enter empty, and says so', async () => {
        await rm(workspaceFile(root, WORKSPACE));

        expect(await readFolderChain(root, WORKSPACE, null)).toEqual([
            {
                level: 'workspace',
                place: { kind: 'workspace' },
                name: WORKSPACE,
                settings: {},
                unreadable: true,
            },
        ]);
    });
});
