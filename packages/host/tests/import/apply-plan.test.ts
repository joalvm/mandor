import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    writeRepoTree,
    createConnection,
    createWorkspace,
    listConnections,
    readCollectionTree,
    readItem,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyPlan } from '../../src/import/apply-plan.js';
import type { ImportPlan } from '@mandor/interop-core';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-apply-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const identity = { kind: 'asyncapi', sourceId: 'abc' } as const;

function planOf(entries: ImportPlan['entries']): ImportPlan {
    return { identity, entries };
}

function connection(): ImportPlan['entries'][number] {
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

function removal(selected: boolean): ImportPlan['entries'][number] {
    return {
        class: 'removal',
        place: 'connection',
        route: 'vieja',
        name: 'vieja',
        resource: null,
        selected,
    };
}

describe('applyPlan', () => {
    it('answers ok for every entry it wrote, in the order the plan named them', async () => {
        const applied = await applyPlan(root, 'pasarela', planOf([connection()]));

        expect(applied).toEqual([{ place: 'connection', route: 'produccion', ok: true }]);
    });

    it('says nothing entered when the plan carries nothing', async () => {
        expect(await applyPlan(root, 'pasarela', { identity: null, entries: [] })).toEqual([]);
    });

    it('answers with a refusal for an entry that carries nothing to write', async () => {
        const applied = await applyPlan(
            root,
            'pasarela',
            planOf([
                {
                    class: 'add',
                    place: 'item',
                    route: 'x/y',
                    name: 'y',
                    resource: null,
                    selected: true,
                },
            ]),
        );

        expect(applied[0]).toMatchObject({ ok: false });
        expect((await readCollectionTree(root, 'pasarela')).nodes).toEqual([]);
    });

    it('writes the tags an item brings', async () => {
        const fields = { method: 'GET', url: 'https://a.test', tags: ['beta'] };

        await applyPlan(
            root,
            'pasarela',
            planOf([
                {
                    class: 'add',
                    place: 'collection',
                    route: 'x',
                    name: 'x',
                    selected: true,
                    resource: {
                        place: 'collection',
                        itemKind: null,
                        route: 'x',
                        name: 'x',
                        fields: { name: 'x' },
                        origin: identity,
                        degradations: [],
                    },
                },
                {
                    class: 'add',
                    place: 'item',
                    route: 'x/y',
                    name: 'y',
                    selected: true,
                    resource: {
                        place: 'item',
                        itemKind: 'request',
                        route: 'x/y',
                        name: 'y',
                        fields,
                        origin: identity,
                        degradations: [],
                    },
                },
            ]),
        );

        await expect(readItem(root, 'pasarela', 'x/y')).resolves.toMatchObject({ tags: ['beta'] });
    });

    it('writes nothing for an entry the user left out', async () => {
        const applied = await applyPlan(
            root,
            'pasarela',
            planOf([{ ...connection(), selected: false }]),
        );
        const connections = await listConnections(root, 'pasarela');

        expect(applied[0]).toMatchObject({ ok: false });
        expect(connections.connections).toEqual([]);
    });

    it('removes what the plan marked as removal, connections included', async () => {
        await createConnection(root, 'pasarela', {
            id: 'vieja',
            name: 'vieja',
            url: 'wss://vieja.example',
        });

        const applied = await applyPlan(root, 'pasarela', planOf([removal(true)]));
        const connections = await listConnections(root, 'pasarela');

        expect(applied[0]).toMatchObject({ ok: true });
        expect(connections.connections).toEqual([]);
    });

    /** A removal starts unticked: deleting one nobody marked loses a file the user kept. */
    it('keeps on disk a removal the user left unmarked', async () => {
        await createConnection(root, 'pasarela', {
            id: 'vieja',
            name: 'vieja',
            url: 'wss://vieja.example',
        });

        const applied = await applyPlan(root, 'pasarela', planOf([removal(false)]));
        const connections = await listConnections(root, 'pasarela');

        expect(applied).toEqual([
            { place: 'connection', route: 'vieja', ok: false, reason: 'excluded' },
        ]);
        expect(connections.connections.map((each) => each.name)).toEqual(['vieja']);
    });

    /** A removal that throws would reject the whole import, and nothing would get committed. */
    it('answers a refusal with its reason for a removal it cannot carry out', async () => {
        await createConnection(root, 'pasarela', {
            id: 'antigua',
            name: 'antigua',
            url: 'wss://antigua.example',
        });

        const applied = await applyPlan(
            root,
            'pasarela',
            planOf([
                removal(true),
                { ...removal(true), route: 'antigua', name: 'antigua' },
                connection(),
            ]),
        );
        const connections = await listConnections(root, 'pasarela');

        expect(applied).toEqual([
            { place: 'connection', route: 'produccion', ok: true },
            {
                place: 'connection',
                route: 'vieja',
                ok: false,
                reason: expect.stringContaining('vieja') as string,
            },
            { place: 'connection', route: 'antigua', ok: true },
        ]);
        expect(connections.connections.map((each) => each.name)).toEqual(['produccion']);
    });
});
