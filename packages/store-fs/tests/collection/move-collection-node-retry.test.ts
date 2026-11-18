import type * as Fs from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refusals = vi.hoisted(() => ({ left: 0 }));

vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof Fs>('node:fs/promises');

    return {
        ...actual,
        rename: async (from: string, to: string) => {
            if (refusals.left > 0) {
                refusals.left -= 1;

                throw Object.assign(new Error('refused'), { code: 'EPERM' });
            }

            await actual.rename(from, to);
        },
    };
});

import { moveCollectionNode } from '../../src/collection/move-collection-node.js';
import { createWorkspace, readItem, writeRepoTree } from '../../src/index.js';
import { mountCollection, TWO_FOLDERS } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    refusals.left = 0;

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await mountCollection(root, WORKSPACE, TWO_FOLDERS);
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('moving a node while the system refuses the rename for a moment', () => {
    it('moves an item once a watcher lets go of it', async () => {
        refusals.left = 2;

        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'envios/pedido-creado',
        });

        expect((await readItem(root, WORKSPACE, 'envios/pedido-creado')).name).toBe(
            'Pedido creado',
        );
    });

    it('moves a whole folder once a watcher lets go of it', async () => {
        refusals.left = 2;

        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos',
            kind: 'folder',
            to: 'pedidos-viejos',
        });

        expect((await readItem(root, WORKSPACE, 'pedidos-viejos/pedido-creado')).name).toBe(
            'Pedido creado',
        );
    });
});
