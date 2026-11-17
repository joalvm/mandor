import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { moveCollectionNode } from '../../src/collection/move-collection-node.js';
import {
    collectionDir,
    createWorkspace,
    fileExists,
    writeRepoTree,
    NameTakenError,
    readCollectionsFile,
    readFolderSettings,
    readItem,
    RootItemError,
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

describe('moving one item', () => {
    it('takes the file to the other folder and the name out of the order it left', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'envios/pedido-creado',
        });

        expect((await readItem(root, WORKSPACE, 'envios/pedido-creado')).name).toBe(
            'Pedido creado',
        );
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
        ]);
    });

    it('puts the name into the order of the folder that received it', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'envios/pedido-creado',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'envios')).order).toEqual([
            'envio-creado',
            'pedido-creado',
        ]);
    });

    it('keeps the place of an item renamed inside its own folder', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'pedidos/pedido-cerrado',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-cerrado',
        ]);
    });

    it('writes the new name of an item the order never mentioned', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'envios/envio-entregado',
            kind: 'item',
            to: 'envios/envio-devuelto',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'envios')).order).toEqual([
            'envio-creado',
            'envio-devuelto',
        ]);
    });

    it('refuses to move an item out to the top level, where only collections live', async () => {
        const move = moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'pedido-creado',
        });

        await expect(move).rejects.toBeInstanceOf(RootItemError);
        expect((await readItem(root, WORKSPACE, 'pedidos/pedido-creado')).name).toBe(
            'Pedido creado',
        );
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['pedidos', 'envios']);
    });

    it('refuses a name another item already has, and writes nothing', async () => {
        const move = moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'envios/envio-creado',
        });

        await expect(move).rejects.toBeInstanceOf(NameTakenError);
        expect((await readItem(root, WORKSPACE, 'envios/envio-creado')).name).toBe('Envio creado');
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
    });

    it('refuses a name a folder already has', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/ayer/folder.yaml': 'name: Ayer\norder: []\n',
        });

        const move = moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'pedidos/ayer',
        });

        await expect(move).rejects.toBeInstanceOf(NameTakenError);
    });
});

describe('moving one collection', () => {
    it('carries its whole directory when the move names it a collection', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos',
            kind: 'collection',
            to: 'compras',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'compras')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
        expect((await readCollectionsFile(root, WORKSPACE)).order).toContain('compras');
    });

    it('moves the file of a folder that rises to the top, with everything it held', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/altas/folder.yaml':
                '# a mano\nname: Altas\nimportedScripts:\n  - event: onResponse\n    dialect: postman\n    source: pm.test()\nfuture: kept\n',
        });

        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/altas',
            kind: 'folder',
            to: 'altas',
        });

        const file = join(collectionDir(root, WORKSPACE), 'altas', 'collection.yaml');
        const text = await readFile(file, 'utf8');

        expect(text).toContain('# a mano');
        expect(text).toContain('future: kept');
        expect(await fileExists(join(collectionDir(root, WORKSPACE), 'altas', 'folder.yaml'))).toBe(
            false,
        );
        expect((await readFolderSettings(root, WORKSPACE, 'altas')).importedScripts).toEqual([
            { event: 'onResponse', dialect: 'postman', source: 'pm.test()' },
        ]);
    });

    it('raises a folder that never had a file, which reads as its directory', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/sueltos/uno.yaml': 'kind: message\nname: Uno\n',
        });

        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/sueltos',
            kind: 'folder',
            to: 'sueltos',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'sueltos')).name).toBe('sueltos');
    });
});
