import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import {
    createCollection,
    createWorkspace,
    writeRepoTree,
    readCollectionsFile,
    readFolderSettings,
    readItem,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeEntry } from '../../src/import/write-entry.js';

let root: string;

const WORKSPACE = 'mi-workspace';
const ORIGIN = { kind: 'postman', sourceId: 'collections:1' } as const;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-entry-routes-'));

    await writeRepoTree(root, 'Repo');
    await createWorkspace(root, { id: 'mi-workspace', name: 'Mi workspace', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function entryOf(
    place: 'collection' | 'folder' | 'item',
    route: string,
    name: string,
): ImportPlanEntry {
    return {
        class: 'add',
        place,
        route,
        name,
        selected: true,
        resource: {
            place,
            itemKind: place === 'item' ? 'request' : null,
            route,
            name,
            fields: {},
            origin: ORIGIN,
            degradations: [],
        },
    };
}

describe('writing entries on the routes the mapper chose', () => {
    it('writes two items of the same name in a nested folder and orders both', async () => {
        await createCollection(root, WORKSPACE, { id: 'demo', name: 'Demo' });
        await writeEntry(root, WORKSPACE, entryOf('folder', 'demo/a', 'A'), ORIGIN);
        await writeEntry(root, WORKSPACE, entryOf('folder', 'demo/a/b', 'B'), ORIGIN);
        await writeEntry(root, WORKSPACE, entryOf('item', 'demo/a/b/x', 'X'), ORIGIN);
        await writeEntry(root, WORKSPACE, entryOf('item', 'demo/a/b/x-2', 'X'), ORIGIN);

        expect((await readItem(root, WORKSPACE, 'demo/a/b/x')).name).toBe('X');
        expect((await readItem(root, WORKSPACE, 'demo/a/b/x-2')).name).toBe('X');
        expect((await readFolderSettings(root, WORKSPACE, 'demo/a/b')).order).toEqual(['x', 'x-2']);
    });

    it('files two examples of the same name under names of their own', async () => {
        const entry = entryOf('item', 'demo/x', 'X');
        const examples = [
            { name: 'OK', status: '200', contentType: 'text/plain', body: '' },
            { name: 'OK', status: '201', contentType: 'text/plain', body: '' },
        ];

        await createCollection(root, WORKSPACE, { id: 'demo', name: 'Demo' });
        await writeEntry(
            root,
            WORKSPACE,
            {
                ...entry,
                resource: entry.resource && { ...entry.resource, fields: { examples } },
            },
            ORIGIN,
        );

        expect((await readItem(root, WORKSPACE, 'demo/x')).body['examples']).toEqual([
            examples[0],
            { ...examples[1], name: 'OK (2)' },
        ]);
    });

    it('writes two collections of the same name, each on its own id', async () => {
        await writeEntry(root, WORKSPACE, entryOf('collection', 'pagos', 'Pagos'), ORIGIN);
        await writeEntry(root, WORKSPACE, entryOf('collection', 'k3m9x2q7a4bd', 'Pagos'), ORIGIN);

        expect((await readFolderSettings(root, WORKSPACE, 'pagos')).name).toBe('Pagos');
        expect((await readFolderSettings(root, WORKSPACE, 'k3m9x2q7a4bd')).name).toBe('Pagos');
        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual([
            'pagos',
            'k3m9x2q7a4bd',
        ]);
    });
});
