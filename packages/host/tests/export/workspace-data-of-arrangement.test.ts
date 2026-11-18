import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    createCollectionFolder,
    createCollectionItem,
    createWorkspace,
    writeRepoTree,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { workspaceDataOf } from '../../src/export/workspace-data-of.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-arrangement-'));
    await writeRepoTree(dir, 'Demo');
    await createWorkspace(dir, { id: 'tienda', name: 'Tienda', kind: 'sync' });
    await createCollectionFolder(dir, 'tienda', '', { id: 'api', name: 'API' });
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

function addItem(id: string) {
    return createCollectionItem(dir, 'tienda', 'api', { id, kind: 'request', name: id });
}

function addFolder(id: string) {
    return createCollectionFolder(dir, 'tienda', 'api', { id, name: id });
}

describe('workspaceDataOf: the arrangement of a level', () => {
    it('says it when a folder comes after an item', async () => {
        await addItem('primera');
        await addFolder('carpeta');

        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.collections[0]?.sequence).toEqual(['item', 'folder']);
    });

    it('says nothing when the folders already come first', async () => {
        await addFolder('carpeta');
        await addItem('primera');

        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.collections[0]).not.toHaveProperty('sequence');
    });

    it('says nothing of a level with only folders', async () => {
        await addFolder('carpeta');

        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.collections[0]).not.toHaveProperty('sequence');
    });
});
