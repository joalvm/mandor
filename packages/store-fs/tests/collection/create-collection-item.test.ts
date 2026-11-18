import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readOrder } from '../../src/collection/collection-order.js';
import { createCollectionItem } from '../../src/collection/create-collection-item.js';
import { NameTakenError } from '../../src/collection/name-taken-error.js';
import { RootItemError } from '../../src/collection/root-item-error.js';
import { createCollection, createWorkspace, itemFile, writeRepoTree } from '../../src/index.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-create-item-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('creating one item', () => {
    it('answers the path it took and writes its file with an empty body', async () => {
        const path = await createCollectionItem(root, WORKSPACE, 'pedidos', {
            id: 'pedido-creado',
            kind: 'message',
            name: 'Pedido creado',
        });

        expect(path).toBe('pedidos/pedido-creado');

        const text = await readFile(itemFile(root, WORKSPACE, path), 'utf8');

        expect(text).toContain('kind: message');
        expect(text).toContain('name: Pedido creado');
    });

    it('files it last in the order of the folder that received it', async () => {
        await createCollectionItem(root, WORKSPACE, 'pedidos', {
            id: 'uno',
            kind: 'message',
            name: 'Uno',
        });
        await createCollectionItem(root, WORKSPACE, 'pedidos', {
            id: 'dos',
            kind: 'message',
            name: 'Dos',
        });

        expect(await readOrder(root, WORKSPACE, 'pedidos')).toEqual(['uno', 'dos']);
    });

    it('refuses an id that is not a slug before writing anything', async () => {
        await expect(
            createCollectionItem(root, WORKSPACE, 'pedidos', {
                id: '../fuga',
                kind: 'message',
                name: 'Fuga',
            }),
        ).rejects.toThrow();

        expect(await readOrder(root, WORKSPACE, 'pedidos')).toEqual([]);
    });

    it('refuses an item at the top level, which holds collections only', async () => {
        await expect(
            createCollectionItem(root, WORKSPACE, '', { id: 'suelto', kind: 'message', name: 'S' }),
        ).rejects.toBeInstanceOf(RootItemError);
    });

    it('refuses a name that something already holds, and leaves the order alone', async () => {
        await createCollectionItem(root, WORKSPACE, 'pedidos', {
            id: 'uno',
            kind: 'message',
            name: 'Uno',
        });

        await expect(
            createCollectionItem(root, WORKSPACE, 'pedidos', {
                id: 'uno',
                kind: 'message',
                name: 'Otro Uno',
            }),
        ).rejects.toBeInstanceOf(NameTakenError);

        expect(await readOrder(root, WORKSPACE, 'pedidos')).toEqual(['uno']);
    });
});
