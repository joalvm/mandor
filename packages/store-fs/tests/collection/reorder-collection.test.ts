import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readOrder } from '../../src/collection/collection-order.js';
import {
    createWorkspace,
    writeRepoTree,
    moveCollectionNode,
    NameTakenError,
    readCollectionsFile,
    readFolderSettings,
    readItem,
    reorderCollectionNode,
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

describe('reordering siblings', () => {
    it('puts the name above the sibling it was dropped on', async () => {
        await reorderCollectionNode(root, WORKSPACE, 'pedidos', {
            name: 'pedido-creado',
            before: 'pedido-pagado',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-creado',
            'pedido-pagado',
        ]);
    });

    it('sends the name last when nothing comes after it', async () => {
        await reorderCollectionNode(root, WORKSPACE, 'pedidos', {
            name: 'pedido-pagado',
            before: null,
        });

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-creado',
            'pedido-pagado',
        ]);
    });

    it('arranges the top level in the root file', async () => {
        await reorderCollectionNode(root, WORKSPACE, '', { name: 'envios', before: 'pedidos' });

        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['envios', 'pedidos']);
    });

    /** The order file can lag behind the disk; a name it never mentioned still lands where asked. */
    it('writes a name the order had not heard of', async () => {
        await reorderCollectionNode(root, WORKSPACE, 'envios', {
            name: 'envio-entregado',
            before: 'envio-creado',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'envios')).order).toEqual([
            'envio-entregado',
            'envio-creado',
        ]);
    });

    /** Reading the order goes through the same file the reorder wrote. */
    it('answers the order of a level from the file that level keeps', async () => {
        await reorderCollectionNode(root, WORKSPACE, '', { name: 'envios', before: 'pedidos' });

        expect(await readOrder(root, WORKSPACE, '')).toEqual(['envios', 'pedidos']);
    });
});

describe('moving one folder', () => {
    beforeEach(async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/ayer/folder.yaml': 'name: Ayer\norder:\n  - viejo\n',
            'pedidos/ayer/viejo.yaml': 'kind: message\nname: Viejo\n',
        });
    });

    it('takes everything under it to the folder that received it', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/ayer',
            kind: 'folder',
            to: 'envios/ayer',
        });

        expect((await readItem(root, WORKSPACE, 'envios/ayer/viejo')).name).toBe('Viejo');
        expect((await readFolderSettings(root, WORKSPACE, 'envios/ayer')).name).toBe('Ayer');
    });

    it('takes its name out of the order it left and puts it last where it arrived', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/ayer',
            kind: 'folder',
            to: 'envios/ayer',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).order).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
        expect((await readFolderSettings(root, WORKSPACE, 'envios')).order).toEqual([
            'envio-creado',
            'ayer',
        ]);
    });

    /** One write per order file: landing somewhere is part of arriving, not a second call. */
    it('lands above the sibling it was dropped on when it changed folder', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            before: 'envio-creado',
            from: 'pedidos/ayer',
            kind: 'folder',
            to: 'envios/ayer',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'envios')).order).toEqual([
            'ayer',
            'envio-creado',
        ]);
    });

    it('refuses a collection that would move inside a folder, and keeps its file', async () => {
        await expect(
            moveCollectionNode(root, WORKSPACE, {
                from: 'envios',
                kind: 'folder',
                to: 'pedidos/envios',
            }),
        ).rejects.toBeInstanceOf(RootItemError);

        expect((await readFolderSettings(root, WORKSPACE, 'envios')).name).toBe('Envios');
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['pedidos', 'envios']);
    });

    it('refuses a name the folder that would receive it already has', async () => {
        await mountCollection(root, WORKSPACE, {
            'envios/ayer/folder.yaml': 'name: Ayer\norder: []\n',
        });

        await expect(
            moveCollectionNode(root, WORKSPACE, {
                from: 'pedidos/ayer',
                kind: 'folder',
                to: 'envios/ayer',
            }),
        ).rejects.toBeInstanceOf(NameTakenError);
    });

    /** The collection that replaces the folder keeps what it said about auth and about import. */
    it('keeps the auth and the import origin the folder spoke of', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/ayer/folder.yaml':
                'name: Ayer\norder: []\nauth:\n  type: bearer\n  token: t\nimportOrigin:\n  kind: postman\n  sourceId: c1\n',
        });

        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/ayer',
            kind: 'folder',
            to: 'ayer',
        });

        const collection = await readFolderSettings(root, WORKSPACE, 'ayer');

        expect(collection.auth).toEqual({ type: 'bearer', token: 't' });
        expect(collection.importOrigin).toEqual({ kind: 'postman', sourceId: 'c1' });
    });
});
