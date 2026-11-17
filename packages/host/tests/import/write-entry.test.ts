import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    writeRepoTree,
    createWorkspace,
    listConnections,
    readFolderSettings,
    readItem,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeCollectionEntry } from '../../src/import/write-collection-entry.js';
import { removeEntry, writeEntry } from '../../src/import/write-entry.js';
import type { ImportPlanEntry } from '@mandor/interop-core';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-write-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const origin = { kind: 'asyncapi', sourceId: 'abc' } as const;

function itemEntry(): ImportPlanEntry {
    return {
        class: 'add',
        place: 'item',
        route: 'pedidos/registrarpedido',
        name: 'registrarPedido',
        selected: true,
        resource: {
            place: 'item',
            itemKind: 'message',
            route: 'pedidos/registrarpedido',
            name: 'registrarPedido',
            fields: {
                channel: 'pedidos/entrantes',
                payload: '',
                payloadType: 'json',
                schema: '{}',
            },
            origin,
            degradations: [],
        },
    };
}

describe('writeEntry', () => {
    it('writes a message with its origin and its fields as the body', async () => {
        await writeEntry(root, 'pasarela', itemEntry(), origin);
        const item = await readItem(root, 'pasarela', 'pedidos/registrarpedido');

        expect(item).toMatchObject({
            kind: 'message',
            name: 'registrarPedido',
            origin,
            body: { channel: 'pedidos/entrantes', schema: '{}' },
        });
    });

    it('writes a connection with the transport the plan chose', async () => {
        await writeEntry(
            root,
            'pasarela',
            {
                class: 'add',
                place: 'connection',
                route: 'produccion',
                name: 'produccion',
                selected: true,
                resource: {
                    place: 'connection',
                    itemKind: null,
                    route: 'produccion',
                    name: 'produccion',
                    fields: {
                        name: 'produccion',
                        url: 'https://tiempo.example',
                        transport: 'socketio',
                        headers: [],
                    },
                    origin,
                    degradations: [],
                },
            },
            origin,
        );

        const connections = await listConnections(root, 'pasarela');

        expect(connections.connections[0]).toMatchObject({ transport: 'socketio', origin });
    });

    it('writes the collection the document arrives as, with the claim of its origin', async () => {
        await writeCollectionEntry(root, 'pasarela', {
            class: 'add',
            place: 'collection',
            route: 'pasarela',
            name: 'Pasarela',
            selected: true,
            resource: {
                place: 'collection',
                itemKind: null,
                route: 'pasarela',
                name: 'Pasarela',
                fields: { name: 'Pasarela', description: 'Lo que la pasarela habla' },
                origin,
                degradations: [],
            },
        });

        const collection = await readFolderSettings(root, 'pasarela', 'pasarela');

        expect(collection).toMatchObject({
            name: 'Pasarela',
            description: 'Lo que la pasarela habla',
        });
        expect(collection.importOrigin).toMatchObject({ kind: 'asyncapi', sourceId: 'abc' });
        expect(typeof collection.importOrigin?.fingerprint).toBe('string');
    });
});

describe('removeEntry', () => {
    it('takes an item out of the collection', async () => {
        await writeEntry(root, 'pasarela', itemEntry(), origin);

        await removeEntry(root, 'pasarela', {
            class: 'removal',
            place: 'item',
            route: 'pedidos/registrarpedido',
            name: 'registrarPedido',
            resource: null,
            selected: true,
        });

        const tree = await readCollectionTreeOf();
        const leaves = tree.nodes.flatMap((node) =>
            node.kind === 'item' ? [node] : node.children,
        );

        expect(leaves).toEqual([]);
    });

    async function readCollectionTreeOf() {
        const { readCollectionTree } = await import('@mandor/store-fs');

        return readCollectionTree(root, 'pasarela');
    }
});
