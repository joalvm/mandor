import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FormatError, parseCollectionItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readFolderSettings } from '../../src/collection/read-folder-settings.js';
import { writeFolderSettings } from '../../src/collection/write-folder-settings.js';
import {
    collectionsFile,
    createWorkspace,
    FileReadError,
    writeRepoTree,
    itemFile,
    readCollectionsFile,
    readItem,
    writeItem,
} from '../../src/index.js';
import { writeCollectionsFile } from '../../src/collection/write-collections-file.js';
import { mountCollection } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

const created = parseCollectionItem({
    kind: 'message',
    name: 'Pedido creado',
    tags: ['pagos'],
    payload: '{"id":1}',
});

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing one item', () => {
    it('makes the folders it needs and reads back what it wrote', async () => {
        await writeItem(root, WORKSPACE, 'pedidos/pedido-creado', created);

        expect(await readItem(root, WORKSPACE, 'pedidos/pedido-creado')).toEqual(created);
    });

    it('writes the keys of the kind beside the envelope, not nested under it', async () => {
        await writeItem(root, WORKSPACE, 'pedidos/pedido-creado', created);

        const written = await readFile(itemFile(root, WORKSPACE, 'pedidos/pedido-creado'), 'utf8');

        expect(written).toContain('payload: ');
        expect(written).not.toContain('body:');
    });

    /** What the other app wrote and this one does not understand has to survive a rewrite. */
    it('keeps unknown keys and comments already in the file', async () => {
        const path = itemFile(root, WORKSPACE, 'pedidos/pedido-creado');

        await writeItem(root, WORKSPACE, 'pedidos/pedido-creado', created);

        const source = await readFile(path, 'utf8');

        await writeFile(path, `# el primero\n${source}retries: 3\n`, 'utf8');
        await writeItem(root, WORKSPACE, 'pedidos/pedido-creado', {
            ...created,
            name: 'Pedido aceptado',
        });

        const written = await readFile(path, 'utf8');

        expect(written).toContain('# el primero');
        expect(written).toContain('retries: 3');
        expect(written).toContain('name: Pedido aceptado');
    });

    it('refuses to write over a file it could not read', async () => {
        await mountCollection(root, WORKSPACE, { 'pedidos/pedido-creado.yaml': 'kind: [\n' });

        await expect(writeItem(root, WORKSPACE, 'pedidos/pedido-creado', created)).rejects.toThrow(
            FileReadError,
        );
    });

    it('refuses a path that is not made of id segments', async () => {
        await expect(writeItem(root, WORKSPACE, '../fuera', created)).rejects.toThrow();
    });
});

describe('writing a folder and the root', () => {
    it('writes the name and the order of a folder', async () => {
        await writeFolderSettings(root, WORKSPACE, 'pedidos', {
            name: 'Pedidos',
            order: ['pedido-creado'],
        });

        expect(await readFolderSettings(root, WORKSPACE, 'pedidos')).toEqual({
            name: 'Pedidos',
            order: ['pedido-creado'],
        });
    });

    it('keeps what it does not understand when it rewrites a folder', async () => {
        await mountCollection(root, WORKSPACE, {
            'api/pedidos/folder.yaml': '# la carpeta\nname: Pedidos\ncolor: azul\n',
        });

        await writeFolderSettings(root, WORKSPACE, 'api/pedidos', { name: 'Pagos', order: [] });

        const written = await readFile(
            join(root, 'workspaces', WORKSPACE, 'collections', 'api', 'pedidos', 'folder.yaml'),
            'utf8',
        );

        expect(written).toContain('# la carpeta');
        expect(written).toContain('color: azul');
        expect(written).toContain('name: Pagos');
    });

    it('writes the order of the top level in the root file', async () => {
        await writeCollectionsFile(root, WORKSPACE, { order: ['envios', 'pedidos'] });

        expect(await readCollectionsFile(root, WORKSPACE)).toEqual({
            order: ['envios', 'pedidos'],
            origin: undefined,
        });
    });

    it('rewrites the root file in place and records where the tree came from', async () => {
        await mountCollection(root, WORKSPACE, {
            'collections.yaml': '# el orden lo manda quien arrastra\norder:\n  - pedidos\n',
        });
        await writeCollectionsFile(root, WORKSPACE, {
            order: ['envios', 'pedidos'],
            origin: { kind: 'openapi', sourceId: 'pedidos.json' },
        });

        const written = await readFile(collectionsFile(root, WORKSPACE), 'utf8');

        expect(written).toContain('# el orden lo manda quien arrastra');
        expect(await readCollectionsFile(root, WORKSPACE)).toEqual({
            order: ['envios', 'pedidos'],
            origin: { kind: 'openapi', sourceId: 'pedidos.json' },
        });
    });

    it('reads an empty root for a workspace that has no collection file', async () => {
        expect(await readCollectionsFile(root, WORKSPACE)).toEqual({
            order: [],
            origin: undefined,
        });
    });

    it('reads a folder with no file by the name of its directory', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/pedido-creado.yaml': 'kind: message\nname: X\n',
        });

        expect(await readFolderSettings(root, WORKSPACE, 'pedidos')).toEqual({
            name: 'pedidos',
            order: [],
        });
    });

    it('refuses to read an item whose file says nothing it understands', async () => {
        await mountCollection(root, WORKSPACE, { 'pedidos/roto.yaml': 'kind: 1\n' });

        await expect(readItem(root, WORKSPACE, 'pedidos/roto')).rejects.toThrow(FileReadError);
    });

    it('refuses to write over a folder file it could not read', async () => {
        await mountCollection(root, WORKSPACE, { 'api/pedidos/folder.yaml': 'name: [\n' });

        await expect(
            writeFolderSettings(root, WORKSPACE, 'api/pedidos', { name: 'Pedidos', order: [] }),
        ).rejects.toThrow(FileReadError);
    });

    it('refuses to write over a root file it could not read', async () => {
        await mountCollection(root, WORKSPACE, { 'collections.yaml': 'order: [\n' });

        await expect(writeCollectionsFile(root, WORKSPACE, { order: [] })).rejects.toThrow(
            FileReadError,
        );
    });

    it('refuses a folder whose name nobody can see', async () => {
        await expect(
            writeFolderSettings(root, WORKSPACE, 'api/pedidos', { name: '  ', order: [] }),
        ).rejects.toThrow(FormatError);
    });
});
