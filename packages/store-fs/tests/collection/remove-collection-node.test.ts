import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readOrder } from '../../src/collection/collection-order.js';
import { removeCollectionNode } from '../../src/collection/remove-collection-node.js';
import {
    createWorkspace,
    fileExists,
    folderDir,
    itemFile,
    writeRepoTree,
} from '../../src/index.js';
import { mountCollection, TWO_FOLDERS } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-remove-node-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await mountCollection(root, WORKSPACE, TWO_FOLDERS);
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('removing a node of the tree', () => {
    it('deletes an item and takes its name out of the order of its folder', async () => {
        await removeCollectionNode(root, WORKSPACE, 'pedidos/pedido-creado');

        expect(await fileExists(itemFile(root, WORKSPACE, 'pedidos/pedido-creado'))).toBe(false);
        expect(await readOrder(root, WORKSPACE, 'pedidos')).toEqual(['pedido-pagado']);
    });

    it('deletes a collection with everything under it and leaves the top level without it', async () => {
        await removeCollectionNode(root, WORKSPACE, 'envios');

        expect(await fileExists(itemFile(root, WORKSPACE, 'envios/envio-creado'))).toBe(false);
        expect(await fileExists(folderDir(root, WORKSPACE, 'envios'))).toBe(false);
        expect(await readOrder(root, WORKSPACE, '')).toEqual(['pedidos']);
    });

    it('keeps the siblings of what it removed', async () => {
        await removeCollectionNode(root, WORKSPACE, 'envios');

        expect(await fileExists(itemFile(root, WORKSPACE, 'pedidos/pedido-pagado'))).toBe(true);
    });

    it('does not fail on a name that is already gone', async () => {
        await expect(
            removeCollectionNode(root, WORKSPACE, 'pedidos/ausente'),
        ).resolves.toBeUndefined();

        expect(await readOrder(root, WORKSPACE, 'pedidos')).toEqual([
            'pedido-pagado',
            'pedido-creado',
        ]);
    });
});
