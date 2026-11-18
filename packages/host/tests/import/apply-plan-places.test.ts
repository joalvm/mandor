import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlan } from '@mandor/interop-core';
import {
    createWorkspace,
    writeRepoTree,
    listEnvironments,
    readCollectionTree,
    writeEnvironment,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyPlan } from '../../src/import/apply-plan.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-apply-places-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const identity = { kind: 'asyncapi', sourceId: 'abc' } as const;

type Entry = ImportPlan['entries'][number];

function planOf(entries: Entry[]): ImportPlan {
    return { identity, entries };
}

function environment(): Entry {
    return {
        class: 'add',
        place: 'environment',
        route: 'prod',
        name: 'Prod',
        selected: true,
        resource: {
            place: 'environment',
            itemKind: null,
            route: 'prod',
            name: 'Prod',
            fields: { name: 'Prod', variables: [] },
            origin: identity,
            degradations: [],
        },
    };
}

function removal(place: Entry['place'], route: string, selected: boolean): Entry {
    return { class: 'removal', place, route, name: route, resource: null, selected };
}

describe('applyPlan with environments', () => {
    it('writes the environments before the rest, and removals last', async () => {
        const connection: Entry = {
            ...environment(),
            place: 'connection',
            route: 'produccion',
            name: 'produccion',
            resource: {
                place: 'connection',
                itemKind: null,
                route: 'produccion',
                name: 'produccion',
                fields: { name: 'produccion', url: 'wss://a.example', transport: 'websocket' },
                origin: identity,
                degradations: [],
            },
        };

        const applied = await applyPlan(
            root,
            'pasarela',
            planOf([removal('connection', 'vieja', false), connection, environment()]),
        );

        expect(applied.map((each) => each.place)).toEqual([
            'environment',
            'connection',
            'connection',
        ]);
    });

    it('deletes an environment only when its removal was marked', async () => {
        await writeEnvironment(root, 'pasarela', {
            id: 'old',
            name: 'Old',
            variables: [],
            origin: identity,
        });

        await applyPlan(root, 'pasarela', planOf([removal('environment', 'old', false)]));

        expect((await listEnvironments(root, 'pasarela')).environments).toHaveLength(1);

        await applyPlan(root, 'pasarela', planOf([removal('environment', 'old', true)]));

        expect((await listEnvironments(root, 'pasarela')).environments).toEqual([]);
    });

    it('writes folders and items as the plan lists them, each after its parent', async () => {
        const entry = (place: 'collection' | 'folder' | 'item', route: string): Entry => ({
            class: 'add',
            place,
            route,
            name: route,
            selected: true,
            resource: {
                place,
                itemKind: place === 'item' ? 'request' : null,
                route,
                name: route,
                fields: place === 'item' ? { method: 'GET', url: 'https://x' } : {},
                origin: identity,
                degradations: [],
            },
        });

        const applied = await applyPlan(
            root,
            'pasarela',
            planOf([
                entry('collection', 'api'),
                entry('item', 'api/uno'),
                entry('folder', 'api/carpeta'),
                entry('item', 'api/carpeta/dentro'),
                entry('item', 'api/dos'),
            ]),
        );
        const { nodes } = await readCollectionTree(root, 'pasarela');

        expect(applied.every(({ ok }) => ok)).toBe(true);
        expect(nodes[0]).toMatchObject({
            children: [{ name: 'api/uno' }, { name: 'api/carpeta' }, { name: 'api/dos' }],
        });
    });
});
