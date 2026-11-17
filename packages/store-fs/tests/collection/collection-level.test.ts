import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { holderOf, levelFile, levelOf, orderFile } from '../../src/collection/collection-level.js';
import { readFolderSettings } from '../../src/collection/read-folder-settings.js';
import { writeFolderSettings } from '../../src/collection/write-folder-settings.js';
import { collectionDir, createWorkspace, writeRepoTree } from '../../src/index.js';
import { mountCollection } from './support/mounted-collection.js';

const WORKSPACE = 'api-de-pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'API de pagos', kind: 'sync' });
    await mountCollection(root, WORKSPACE, {
        'collections.yaml': 'order:\n  - pedidos\n',
        'pedidos/collection.yaml': 'name: Pedidos\nauth:\n  type: none\n',
        'pedidos/altas/folder.yaml': '# altas\nname: Altas\nextra: kept\n',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function inTree(...parts: string[]): string {
    return join(collectionDir(root, WORKSPACE), ...parts);
}

describe('the level of a path of the tree', () => {
    it.each([
        ['pedidos', 'collection'],
        ['pedidos/altas', 'folder'],
        ['pedidos/altas/hoy', 'folder'],
    ])('names %s a %s', (path, level) => {
        expect(levelOf(path)).toBe(level);
    });

    it('lists the children of the top level in the root file', () => {
        expect(holderOf('')).toBe('root');
        expect(holderOf('pedidos')).toBe('collection');
        expect(holderOf('pedidos/altas')).toBe('folder');
    });

    it('refuses a path that climbs out of the tree', () => {
        expect(() => levelOf('../fuera')).toThrow();
    });
});

describe('the file of each level', () => {
    it('is collection.yaml for a collection and folder.yaml below it', () => {
        expect(levelFile(root, WORKSPACE, 'pedidos')).toBe(inTree('pedidos', 'collection.yaml'));
        expect(levelFile(root, WORKSPACE, 'pedidos/altas')).toBe(
            inTree('pedidos', 'altas', 'folder.yaml'),
        );
    });

    it('keeps the order of the top level in the root file', () => {
        expect(orderFile(root, WORKSPACE, '')).toBe(inTree('collections.yaml'));
        expect(orderFile(root, WORKSPACE, 'pedidos')).toBe(inTree('pedidos', 'collection.yaml'));
        expect(orderFile(root, WORKSPACE, 'pedidos/altas')).toBe(
            inTree('pedidos', 'altas', 'folder.yaml'),
        );
    });

    it('reads a collection by its own file, auth included', async () => {
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).auth).toEqual({
            type: 'none',
        });
        expect((await readFolderSettings(root, WORKSPACE, 'pedidos/altas')).name).toBe('Altas');
    });

    it('patches one key and leaves the rest of the file as it was', async () => {
        await writeFolderSettings(root, WORKSPACE, 'pedidos/altas', { name: 'Altas nuevas' });
        await writeFolderSettings(root, WORKSPACE, 'pedidos', { order: ['altas'] });

        const folder = await readFile(inTree('pedidos', 'altas', 'folder.yaml'), 'utf8');

        expect(folder).toContain('# altas\nname: Altas nuevas\nextra: kept\n');
        expect(await readFolderSettings(root, WORKSPACE, 'pedidos')).toMatchObject({
            name: 'Pedidos',
            order: ['altas'],
            auth: { type: 'none' },
        });
    });
});
