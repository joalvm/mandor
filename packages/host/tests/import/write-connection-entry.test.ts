import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import { createWorkspace, writeRepoTree, listConnections } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeConnectionEntry } from '../../src/import/write-connection-entry.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-write-connection-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const origin = { kind: 'insomnia', sourceId: 'wrk:1' } as const;

function connectionEntry(
    entryClass: 'add' | 'update',
    fields: Record<string, unknown>,
): ImportPlanEntry {
    return {
        class: entryClass,
        place: 'connection',
        route: 'pedidos-en-vivo',
        name: 'Pedidos en vivo',
        selected: true,
        resource: {
            place: 'connection',
            itemKind: null,
            route: 'pedidos-en-vivo',
            name: 'Pedidos en vivo',
            fields: { name: 'Pedidos en vivo', transport: 'websocket', ...fields },
            origin,
            degradations: [],
        },
    };
}

const FULL = {
    url: 'wss://api.test/pedidos',
    headers: [
        { key: 'X-Token', value: '{{token}}', enabled: true },
        { key: 'X-Off', value: '1', enabled: false },
    ],
    params: [{ key: 'sala', value: '1', enabled: true }],
    description: 'Canal de pedidos.',
    auth: { type: 'bearer', token: '{{token}}' },
    websocket: { subprotocols: ['json', 'v2'] },
};

describe('writeConnectionEntry', () => {
    it('is written with the headers, query, notes, auth and subprotocols the document carried', async () => {
        await writeConnectionEntry(root, 'pasarela', connectionEntry('add', FULL), origin);
        const { connections } = await listConnections(root, 'pasarela');

        expect(connections).toHaveLength(1);
        expect(connections[0]).toMatchObject({ ...FULL, transport: 'websocket', origin });
    });

    it('is updated with what the document carries now, its headers included', async () => {
        await writeConnectionEntry(root, 'pasarela', connectionEntry('add', FULL), origin);

        await writeConnectionEntry(
            root,
            'pasarela',
            connectionEntry('update', {
                url: 'wss://api.test/otros',
                headers: [{ key: 'X-Token', value: 'nuevo', enabled: true }],
                description: 'Otro canal.',
            }),
            origin,
        );
        const { connections } = await listConnections(root, 'pasarela');

        expect(connections[0]).toMatchObject({
            url: 'wss://api.test/otros',
            headers: [{ key: 'X-Token', value: 'nuevo', enabled: true }],
            description: 'Otro canal.',
            params: [{ key: 'sala', value: '1', enabled: true }],
        });
    });

    it('is written without a part that is not valid and keeps the rest', async () => {
        const headers = [{ key: 'A', value: '1', enabled: true }];
        const fields = { url: 'wss://api.test/x', headers, description: 7 };

        await writeConnectionEntry(root, 'pasarela', connectionEntry('add', fields), origin);
        const { connections } = await listConnections(root, 'pasarela');

        expect(connections[0]).toMatchObject({ headers });
        expect(connections[0]?.description).toBeUndefined();
    });
});
