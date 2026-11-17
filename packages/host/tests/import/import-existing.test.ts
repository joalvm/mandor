import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    writeRepoTree,
    createWorkspace,
    createConnection,
    createCollectionFolder,
    createCollectionItem,
    writeItem,
} from '@mandor/store-fs';
import { fingerprintOf } from '@mandor/interop-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { existingResourcesOf } from '../../src/import/import-existing.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-existing-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('existingResourcesOf', () => {
    it('answers nothing when the workspace is empty', async () => {
        expect(await existingResourcesOf(root, 'pasarela')).toEqual([]);
    });

    it('lists connections, collections, folders and items as the plan names them', async () => {
        const origin = { kind: 'postman' as const, sourceId: 'coleccion@1' };

        await createConnection(root, 'pasarela', {
            id: 'produccion',
            name: 'produccion',
            url: 'wss://pasarela.example/v1',
            origin,
        });
        await createCollectionFolder(root, 'pasarela', '', { id: 'pedidos', name: 'Pedidos' });
        await createCollectionFolder(root, 'pasarela', 'pedidos', { id: 'sub', name: 'Sub' });
        await createCollectionItem(root, 'pasarela', 'pedidos/sub', {
            id: 'pedido',
            kind: 'message',
            name: 'Pedido',
        });
        await writeItem(root, 'pasarela', 'pedidos/sub/pedido', {
            kind: 'message',
            name: 'Pedido',
            tags: [],
            origin,
            body: { payload: '' },
        });

        const existing = await existingResourcesOf(root, 'pasarela');

        expect(existing).toEqual([
            {
                place: 'connection',
                route: 'produccion',
                name: 'produccion',
                origin,
                fingerprint: fingerprintOf({
                    name: 'produccion',
                    url: 'wss://pasarela.example/v1',
                    transport: 'websocket',
                    headers: [],
                }),
            },
            {
                place: 'collection',
                route: 'pedidos',
                name: 'Pedidos',
                origin: undefined,
                fingerprint: fingerprintOf({ name: 'Pedidos' }),
            },
            { place: 'folder', route: 'pedidos/sub', name: 'Sub' },
            {
                place: 'item',
                route: 'pedidos/sub/pedido',
                name: 'Pedido',
                origin,
                fingerprint: fingerprintOf({ name: 'Pedido', payload: '' }),
            },
        ]);
    });

    it('reads the tags of an item as the import hashed them, so it does not look edited', async () => {
        const origin = { kind: 'bruno' as const, sourceId: 'c' };

        await createCollectionFolder(root, 'pasarela', '', { id: 'pedidos', name: 'Pedidos' });
        await createCollectionItem(root, 'pasarela', 'pedidos', {
            id: 'pedido',
            kind: 'request',
            name: 'Pedido',
        });
        await writeItem(root, 'pasarela', 'pedidos/pedido', {
            kind: 'request',
            name: 'Pedido',
            tags: [],
            origin,
            body: { url: 'u', tags: ['beta'] },
        });

        const existing = await existingResourcesOf(root, 'pasarela');

        expect(existing.find(({ place }) => place === 'item')?.fingerprint).toBe(
            fingerprintOf({ name: 'Pedido', url: 'u', tags: ['beta'] }),
        );
    });
});
