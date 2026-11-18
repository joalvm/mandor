import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createCollection,
    createCollectionFolder,
    createCollectionItem,
    createWorkspace,
    writeRepoTree,
    moveCollectionNode,
    readCollectionsFile,
    readFolderSettings,
    readCollectionTree,
    RootItemError,
} from '../../src/index.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
    await createCollectionFolder(root, WORKSPACE, 'pedidos', { id: 'ayer', name: 'Ayer' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function writeLooseItem(text = 'kind: message\nname: Suelto\n'): Promise<void> {
    const file = join(root, 'workspaces', WORKSPACE, 'collections', 'suelto.yaml');

    await writeFile(file, text, 'utf8');
}

describe('the top level holds collections only', () => {
    it('refuses to create an item with no collection above it', async () => {
        await expect(
            createCollectionItem(root, WORKSPACE, '', {
                id: 'suelto',
                kind: 'message',
                name: 'Suelto',
            }),
        ).rejects.toBeInstanceOf(RootItemError);
    });

    it('refuses to move an item out to the top level, and writes nothing', async () => {
        await createCollectionItem(root, WORKSPACE, 'pedidos/ayer', {
            id: 'anidado',
            kind: 'message',
            name: 'Anidado',
        });

        await expect(
            moveCollectionNode(root, WORKSPACE, {
                from: 'pedidos/ayer/anidado',
                kind: 'item',
                to: 'anidado',
            }),
        ).rejects.toBeInstanceOf(RootItemError);
    });

    it('refuses to move a collection inside a folder, and keeps its file', async () => {
        await expect(
            moveCollectionNode(root, WORKSPACE, {
                from: 'pedidos',
                kind: 'collection',
                to: 'pedidos/ayer/pedidos',
            }),
        ).rejects.toBeInstanceOf(RootItemError);

        expect((await readFolderSettings(root, WORKSPACE, 'pedidos')).name).toBe('Pedidos');
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['pedidos']);
    });

    it('takes a folder out to the top level as the collection it becomes', async () => {
        await moveCollectionNode(root, WORKSPACE, {
            from: 'pedidos/ayer',
            kind: 'folder',
            to: 'ayer',
        });

        expect((await readFolderSettings(root, WORKSPACE, 'ayer')).name).toBe('Ayer');
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['pedidos', 'ayer']);
    });

    it('leaves an item file loose at the top level out of the tree, and says which one', async () => {
        await writeLooseItem();

        const tree = await readCollectionTree(root, WORKSPACE);

        expect(tree.nodes.map((node) => node.path)).toEqual(['pedidos']);
        expect(tree.warnings).toHaveLength(1);
        expect(tree.warnings[0]?.path).toContain('suelto.yaml');
        expect(tree.warnings[0]?.name).toBe('Suelto');
    });

    it('warns of a loose item with no name without giving it one', async () => {
        await writeLooseItem('kind: message\n');

        const { warnings } = await readCollectionTree(root, WORKSPACE);

        expect(warnings).toHaveLength(1);
        expect(warnings[0]).not.toHaveProperty('name');
    });
});
