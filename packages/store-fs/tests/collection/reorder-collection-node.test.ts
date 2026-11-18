import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readOrder } from '../../src/collection/collection-order.js';
import { reorderCollectionNode } from '../../src/collection/reorder-collection-node.js';
import { createWorkspace, itemFile, writeRepoTree } from '../../src/index.js';
import { mountCollection, TWO_FOLDERS } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-reorder-node-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await mountCollection(root, WORKSPACE, TWO_FOLDERS);
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reordering the children of one place', () => {
    it('moves a name above the sibling it was dropped on', async () => {
        await reorderCollectionNode(root, WORKSPACE, 'pedidos', {
            name: 'pedido-creado',
            before: 'pedido-pagado',
        });

        expect(await readOrder(root, WORKSPACE, 'pedidos')).toEqual([
            'pedido-creado',
            'pedido-pagado',
        ]);
    });

    it('sends a name to the end of the top level', async () => {
        await reorderCollectionNode(root, WORKSPACE, '', { name: 'pedidos', before: null });

        expect(await readOrder(root, WORKSPACE, '')).toEqual(['envios', 'pedidos']);
    });

    it('touches no file but the one that holds the order', async () => {
        const before = await readFile(itemFile(root, WORKSPACE, 'pedidos/pedido-creado'), 'utf8');

        await reorderCollectionNode(root, WORKSPACE, 'pedidos', {
            name: 'pedido-creado',
            before: 'pedido-pagado',
        });

        expect(await readFile(itemFile(root, WORKSPACE, 'pedidos/pedido-creado'), 'utf8')).toBe(
            before,
        );
    });
});
