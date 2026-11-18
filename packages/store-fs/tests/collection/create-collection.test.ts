import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCollectionFolder } from '../../src/collection/create-collection-folder.js';
import { createCollectionGroup } from '../../src/collection/create-collection-group.js';
import {
    createCollectionItem,
    createWorkspace,
    fileExists,
    folderDir,
    writeRepoTree,
    itemFile,
    NameTakenError,
    readCollectionsFile,
    readFolderSettings,
    readItem,
    removeCollectionNode,
} from '../../src/index.js';
import { readOrder } from '../../src/collection/collection-order.js';
import { mountCollection, TWO_FOLDERS } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

const ITEM = { kind: 'message', name: 'Envio anulado' };

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

describe('creating a folder', () => {
    it('writes the visible name under the id it was given and answers with the path', async () => {
        const path = await createCollectionFolder(root, WORKSPACE, 'pedidos', {
            id: 'k3m9x2q7a4bd',
            name: 'Pedidos de ayer',
        });

        expect(path).toBe('pedidos/k3m9x2q7a4bd');
        expect((await readFolderSettings(root, WORKSPACE, path)).name).toBe('Pedidos de ayer');
    });

    it('puts the new id last in the order of the folder holding it', async () => {
        await createCollectionFolder(root, WORKSPACE, 'pedidos', {
            id: 'k3m9x2q7a4bd',
            name: 'Pedidos de ayer',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
            'k3m9x2q7a4bd',
        ]);
    });

    it('arranges the top level in the root file when nothing holds it', async () => {
        await createCollectionFolder(root, WORKSPACE, '', { id: 'cobros', name: 'Cobros' });

        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual([
            'pedidos',
            'envios',
            'cobros',
        ]);
    });

    it('writes the file its level reads: collection.yaml on top, folder.yaml below', async () => {
        await createCollectionGroup(root, WORKSPACE, '', { id: 'cobros', name: 'Cobros' });
        await createCollectionGroup(root, WORKSPACE, 'cobros', { id: 'altas', name: 'Altas' });

        expect(
            await fileExists(join(folderDir(root, WORKSPACE, 'cobros'), 'collection.yaml')),
        ).toBe(true);
        expect(
            await fileExists(join(folderDir(root, WORKSPACE, 'cobros/altas'), 'folder.yaml')),
        ).toBe(true);
        expect((await readFolderSettings(root, WORKSPACE, 'cobros')).order).toEqual(['altas']);
    });

    it('keeps two folders of the same name apart by their ids', async () => {
        await createCollectionFolder(root, WORKSPACE, 'pedidos', { id: 'uno', name: 'Altas' });
        await createCollectionFolder(root, WORKSPACE, 'pedidos', { id: 'dos', name: 'Altas' });

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos/uno')).name).toBe('Altas');
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos/dos')).name).toBe('Altas');
    });

    it('refuses an id an item already has and writes nothing', async () => {
        await expect(
            createCollectionFolder(root, WORKSPACE, 'pedidos', {
                id: 'pedido-creado',
                name: 'Pedido creado',
            }),
        ).rejects.toBeInstanceOf(NameTakenError);
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
    });

    it('refuses an id that is not a slug before writing anything', async () => {
        await expect(
            createCollectionFolder(root, WORKSPACE, 'pedidos', { id: 'A B', name: 'Pets' }),
        ).rejects.toThrow();
        expect(await readOrder(root, WORKSPACE, 'pedidos')).not.toContain('a b');
    });
});

describe('creating an item', () => {
    it('writes the kind of the leaf and the name under the id it was given', async () => {
        const path = await createCollectionItem(root, WORKSPACE, 'envios', {
            ...ITEM,
            id: 'h7q2n5v8c1ze',
        });

        expect(path).toBe('envios/h7q2n5v8c1ze');
        expect(await readItem(root, WORKSPACE, path)).toMatchObject({
            kind: 'message',
            name: 'Envio anulado',
            tags: [],
        });
    });

    it('puts the new id last in the order of the folder holding it', async () => {
        await createCollectionItem(root, WORKSPACE, 'envios', { ...ITEM, id: 'h7q2n5v8c1ze' });

        expect((await readFolderSettings(root, WORKSPACE, 'envios')).order).toEqual([
            'envio-creado',
            'h7q2n5v8c1ze',
        ]);
    });

    it('keeps two items of the same name apart by their ids', async () => {
        await createCollectionItem(root, WORKSPACE, 'pedidos', { ...ITEM, id: 'uno' });
        await createCollectionItem(root, WORKSPACE, 'pedidos', { ...ITEM, id: 'dos' });

        expect((await readItem(root, WORKSPACE, 'pedidos/uno')).name).toBe(ITEM.name);
        expect((await readItem(root, WORKSPACE, 'pedidos/dos')).name).toBe(ITEM.name);
    });

    it('refuses an id a sibling already has and writes nothing', async () => {
        await expect(
            createCollectionItem(root, WORKSPACE, 'pedidos', {
                id: 'pedido-creado',
                kind: 'message',
                name: 'Otro',
            }),
        ).rejects.toBeInstanceOf(NameTakenError);
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
    });

    it('refuses an id that is not a slug before writing anything', async () => {
        await expect(
            createCollectionItem(root, WORKSPACE, 'pedidos', { ...ITEM, id: 'A B' }),
        ).rejects.toThrow();
        expect(await readOrder(root, WORKSPACE, 'pedidos')).not.toContain('a b');
    });
});

describe('removing a node', () => {
    it('takes the file of an item and its name out of the order', async () => {
        await removeCollectionNode(root, WORKSPACE, 'pedidos/pedido-creado');

        expect(await fileExists(itemFile(root, WORKSPACE, 'pedidos/pedido-creado'))).toBe(false);
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
        ]);
    });

    it('takes a folder with everything under it', async () => {
        await removeCollectionNode(root, WORKSPACE, 'pedidos');

        expect(await fileExists(folderDir(root, WORKSPACE, 'pedidos'))).toBe(false);
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['envios']);
    });

    it('leaves the order alone when the path names nothing', async () => {
        await removeCollectionNode(root, WORKSPACE, 'pedidos/pedido-inventado');

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
    });
});
