import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renameFolder } from '../../src/collection/rename-folder.js';
import { renameItem } from '../../src/collection/rename-item.js';
import {
    createWorkspace,
    writeRepoTree,
    readCollectionsFile,
    readFolderSettings,
    readItem,
} from '../../src/index.js';
import { mountCollection, TWO_FOLDERS } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await mountCollection(root, WORKSPACE, TWO_FOLDERS);
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('renaming one folder', () => {
    it('writes the name a person reads and keeps the order of its children', async () => {
        await renameFolder(root, WORKSPACE, 'pedidos', 'Pedidos del día');

        expect(await readFolderSettings(root, WORKSPACE, 'pedidos')).toEqual({
            name: 'Pedidos del día',
            order: ['pedido-pagado', 'pedido-creado'],
        });
    });

    /** The id is the identity: a tab open on something inside keeps pointing at it. */
    it('leaves the folder and what is inside it where they are', async () => {
        await renameFolder(root, WORKSPACE, 'pedidos', 'Pedidos del día');

        expect((await readItem(root, WORKSPACE, 'pedidos/pedido-creado')).name).toBe(
            'Pedido creado',
        );
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['pedidos', 'envios']);
    });

    it('renames a folder that hangs from another one', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/altas/folder.yaml': 'name: Altas\norder: []\n',
            'pedidos/altas/alta-creada.yaml': 'kind: message\nname: Alta creada\n',
        });
        await renameFolder(root, WORKSPACE, 'pedidos/altas', 'Bajas');

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos/altas')).name).toBe('Bajas');
        expect((await readItem(root, WORKSPACE, 'pedidos/altas/alta-creada')).name).toBe(
            'Alta creada',
        );
    });

    /** Two folders may read the same: what tells them apart is the id, not the word. */
    it('takes a name another folder already has', async () => {
        await renameFolder(root, WORKSPACE, 'pedidos', 'Envios');

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).name).toBe('Envios');
        expect((await readFolderSettings(root, WORKSPACE, 'envios')).name).toBe('Envios');
    });
});

describe('renaming one item', () => {
    it('writes the name inside the file and keeps the rest of it', async () => {
        await renameItem(root, WORKSPACE, 'pedidos/pedido-creado', 'Pedido abierto');

        expect(await readItem(root, WORKSPACE, 'pedidos/pedido-creado')).toMatchObject({
            name: 'Pedido abierto',
            tags: ['pagos'],
        });
    });

    it('leaves the file and the order where they were', async () => {
        await renameItem(root, WORKSPACE, 'pedidos/pedido-creado', 'Pedido abierto');

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
    });

    it('takes a name a sibling already has', async () => {
        await renameItem(root, WORKSPACE, 'pedidos/pedido-creado', 'Pedido pagado');

        expect((await readItem(root, WORKSPACE, 'pedidos/pedido-creado')).name).toBe(
            'Pedido pagado',
        );
        expect((await readItem(root, WORKSPACE, 'pedidos/pedido-pagado')).name).toBe(
            'Pedido pagado',
        );
    });
});
