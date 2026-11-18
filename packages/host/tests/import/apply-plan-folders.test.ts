import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlan } from '@mandor/interop-core';
import {
    createCollectionFolder,
    createWorkspace,
    writeRepoTree,
    writeFolderSettings,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyPlan } from '../../src/import/apply-plan.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-apply-folders-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const identity = { kind: 'asyncapi', sourceId: 'abc' } as const;

type Entry = ImportPlan['entries'][number];

function connection(): Entry {
    return {
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
                url: 'wss://pasarela.example/v1',
                transport: 'websocket',
                headers: [],
            },
            origin: identity,
            degradations: [],
        },
    };
}

describe('applying folders of a plan', () => {
    it('answers folder-taken for a folder whose auth was set by hand, and writes the rest', async () => {
        await createCollectionFolder(root, 'pasarela', '', { id: 'users', name: 'Users' });
        await writeFolderSettings(root, 'pasarela', 'users', {
            name: 'Users',
            order: [],
            auth: { type: 'bearer', token: '{{mine}}' },
        });

        const folder: Entry = {
            class: 'update',
            place: 'folder',
            route: 'users',
            name: 'Users',
            selected: true,
            resource: {
                place: 'folder',
                itemKind: null,
                route: 'users',
                name: 'Users',
                fields: { auth: { type: 'bearer', token: '{{theirs}}' } },
                origin: identity,
                degradations: [],
            },
        };

        const applied = await applyPlan(root, 'pasarela', {
            identity,
            entries: [folder, connection()],
        });

        expect(applied).toEqual([
            { place: 'folder', route: 'users', ok: false, reason: 'folder-taken' },
            { place: 'connection', route: 'produccion', ok: true },
        ]);
    });
});
