import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readFolderSettings } from '../../src/collection/read-folder-settings.js';
import { writeFolderSettings } from '../../src/collection/write-folder-settings.js';
import {
    createCollection,
    createWorkspace,
    writeRepoTree,
    readCollectionsFile,
} from '../../src/index.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the file of one collection', () => {
    it('reads a collection without a file as one that says nothing yet', async () => {
        const collection = await readFolderSettings(root, WORKSPACE, 'petstore');

        expect(collection).toEqual({
            name: 'petstore',
            order: [],
        });
    });

    it('keeps what it does not understand when it rewrites the file', async () => {
        const file = join(
            root,
            'workspaces',
            WORKSPACE,
            'collections',
            'petstore',
            'collection.yaml',
        );

        await writeFolderSettings(root, WORKSPACE, 'petstore', { name: 'Petstore', order: [] });
        await writeFolderSettings(root, WORKSPACE, 'petstore', {
            name: 'Petstore',
            order: ['pedidos'],
            description: 'One collection per document',
        });

        const written = await readFile(file, 'utf8');

        expect(written).toContain('description: One collection per document');
        expect(written).toContain('name: Petstore');
        expect((await readFolderSettings(root, WORKSPACE, 'petstore')).order).toEqual(['pedidos']);
    });

    it('creates the collection and records it in the order of the top level', async () => {
        const path = await createCollection(root, WORKSPACE, {
            id: 'swagger-petstore',
            name: 'Swagger Petstore',
        });

        expect(path).toBe('swagger-petstore');
        expect(await readCollectionsFile(root, WORKSPACE)).toEqual({ order: ['swagger-petstore'] });
        expect((await readFolderSettings(root, WORKSPACE, path)).name).toBe('Swagger Petstore');
    });

    it('writes what an import carries with the origin that owns it', async () => {
        const origin = { kind: 'openapi', sourceId: 's1', fingerprint: 'f1' } as const;

        await writeFolderSettings(root, WORKSPACE, 'petstore', { name: 'Petstore', order: [] });
        await writeFolderSettings(root, WORKSPACE, 'petstore', {
            name: 'Swagger Petstore',
            description: 'The document said so',
            auth: { type: 'basic', username: 'u', password: 'p' },
            importOrigin: origin,
        });

        const collection = await readFolderSettings(root, WORKSPACE, 'petstore');

        expect(collection.name).toBe('Swagger Petstore');
        expect(collection.description).toBe('The document said so');
        expect(collection.importOrigin).toEqual(origin);
    });

    it('takes a key out when the patch carries undefined for it', async () => {
        const origin = { kind: 'openapi', sourceId: 's1', fingerprint: 'f1' } as const;

        await writeFolderSettings(root, WORKSPACE, 'petstore', { name: 'Petstore', order: [] });
        await writeFolderSettings(root, WORKSPACE, 'petstore', {
            name: 'Swagger Petstore',
            description: 'The document said so',
            auth: { type: 'basic', username: 'u', password: 'p' },
            importOrigin: origin,
        });
        await writeFolderSettings(root, WORKSPACE, 'petstore', {
            name: 'Swagger Petstore',
            description: undefined,
            auth: undefined,
            importOrigin: undefined,
        });

        const collection = await readFolderSettings(root, WORKSPACE, 'petstore');

        expect(collection.description).toBeUndefined();
        expect(collection.auth).toBeUndefined();
        expect(collection.importOrigin).toBeUndefined();
    });
});
