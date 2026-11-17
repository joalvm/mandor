import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { irDiff, workspaceToIr } from '@mandor/interop-core';
import {
    createCollection,
    createCollectionFolder,
    createCollectionItem,
    createWorkspace,
    writeRepoTree,
    writeFolderSettings,
    writeItem,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { workspaceDataOf } from '../../src/export/workspace-data-of.js';
import { readFixture } from '../interop/fixture-format.js';
import { writeImportedResources } from './support/imported-resources.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-round-trip-'));
    await writeRepoTree(dir, 'Demo');
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('a workspace of requests as the HTTP document it exports', () => {
    it('reads back what the imported OpenAPI wrote, servers, schemes and default included', async () => {
        await createWorkspace(dir, { id: 'tienda', name: 'Tienda', kind: 'sync' });

        const { held: expected, resources } = readFixture('ida-vuelta-openapi');

        await writeImportedResources(dir, 'tienda', resources);

        const held = workspaceToIr(await workspaceDataOf(dir, 'tienda'));

        if (expected === undefined) {
            throw new Error('ida-vuelta-openapi keeps what the workspace held');
        }

        expect(irDiff(held, expected)).toEqual([]);
    });

    it('reads the whole tree, every level with what its own file declares', async () => {
        await createWorkspace(dir, { id: 'almacen', name: 'Almacen', kind: 'sync' });
        await createCollection(dir, 'almacen', { id: 'mascotas', name: 'mascotas' });
        await createCollectionFolder(dir, 'almacen', 'mascotas', { id: 'a', name: 'A' });
        await createCollectionFolder(dir, 'almacen', 'mascotas/a', { id: 'b', name: 'B' });
        await createCollectionItem(dir, 'almacen', 'mascotas/a/b', {
            id: 'lista',
            kind: 'request',
            name: 'lista',
        });
        await writeFolderSettings(dir, 'almacen', 'mascotas/a', {
            description: 'Lo de A',
            auth: { type: 'bearer', token: 'de-a' },
        });
        await writeFolderSettings(dir, 'almacen', 'mascotas/a/b', {
            auth: { inherit: true },
            headers: [{ key: 'X-B', value: '1', enabled: true }],
            variables: [{ name: 'hondo', value: 'si', enabled: true, secret: false }],
        });

        const [collection] = (await workspaceDataOf(dir, 'almacen')).collections;
        const a = collection?.folders[0];
        const b = a?.folders[0];

        expect(collection?.settings).toEqual({ variables: [], headers: [] });
        expect(a?.settings).toEqual({
            description: 'Lo de A',
            variables: [],
            auth: { type: 'bearer', token: 'de-a' },
            headers: [],
        });
        expect(a?.items).toEqual([]);
        expect(b?.settings).toEqual({
            variables: [{ name: 'hondo', value: 'si', enabled: true, secret: false }],
            headers: [{ key: 'X-B', value: '1', enabled: true }],
        });
        expect(b?.items.map((item) => item.name)).toEqual(['lista']);
    });

    it('carries the auth a folder speaks down to the requests that inherit it', async () => {
        await createWorkspace(dir, { id: 'almacen', name: 'Almacen', kind: 'sync' });
        await createCollection(dir, 'almacen', { id: 'mascotas', name: 'mascotas' });
        await writeFolderSettings(dir, 'almacen', 'mascotas', {
            name: 'mascotas',
            order: [],
            auth: { type: 'bearer', token: 'de-la-carpeta' },
        });

        await createCollectionFolder(dir, 'almacen', 'mascotas', {
            id: 'anidados',
            name: 'anidados',
        });
        await createCollectionItem(dir, 'almacen', 'mascotas/anidados', {
            id: 'lista',
            kind: 'request',
            name: 'lista',
        });
        await writeItem(dir, 'almacen', 'mascotas/anidados/lista', {
            kind: 'request',
            name: 'lista',
            tags: [],
            body: { method: 'GET', url: '{{baseUrl}}/pets' },
        });

        const held = workspaceToIr(await workspaceDataOf(dir, 'almacen'));

        expect(held.security).toEqual({
            bearerAuth: { type: 'http', extras: { scheme: 'bearer' } },
        });
        expect(held.operations[0]?.http?.security).toEqual(['bearerAuth']);
        expect(held.operations[0]?.http?.tags).toEqual(['anidados']);
        expect(held.defaultSecurity).toEqual([]);
    });
});
