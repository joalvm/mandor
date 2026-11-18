import { describe, expect, it } from 'vitest';

import { importPlan } from '../../src/plan/import-plan.js';
import type { ExistingResource } from '../../src/resource/existing-resource.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const collection = { kind: 'postman', sourceId: 'coleccion@7' } as const;
const environment = { kind: 'postman', sourceId: 'entorno@3' } as const;

function resource(
    place: ImportResource['place'],
    origin: ImportResource['origin'],
): ImportResource {
    return {
        place,
        itemKind: null,
        route: place === 'environment' ? 'local' : 'tienda',
        name: place,
        fields: {},
        origin,
        degradations: [],
    };
}

describe('planning the files of a workspace', () => {
    // A workspace comes from several files, each with its own origin, and only into a new one.
    it('adds everything when no file is compared with anything', () => {
        const plan = importPlan(
            [resource('collection', collection), resource('environment', environment)],
            [],
            () => 'minted',
        );

        expect(plan.entries.map(({ class: kind }) => kind)).toEqual(['add', 'add']);
        expect(plan.identity).toEqual(collection);
    });

    it('compares each file with its own origin in a workspace that already holds things', () => {
        const held: ExistingResource = {
            place: 'collection',
            route: 'tienda',
            name: 'tienda',
            origin: collection,
        };
        const plan = importPlan(
            [resource('collection', collection), resource('environment', environment)],
            [held],
            () => 'minted',
        );

        expect(plan.entries.map(({ class: kind, place }) => `${place}:${kind}`)).toEqual([
            'collection:update',
            'environment:add',
        ]);
    });

    it('still calls a route held by someone else a conflict, whatever the other files are', () => {
        const stranger: ExistingResource = {
            place: 'environment',
            route: 'local',
            name: 'local',
            origin: { kind: 'postman', sourceId: 'otro@1' },
        };
        const plan = importPlan(
            [resource('collection', collection), resource('environment', environment)],
            [stranger],
            () => 'minted',
        );

        expect(plan.entries.map(({ class: kind, place }) => `${place}:${kind}`)).toEqual([
            'collection:add',
            'environment:conflict',
        ]);
    });

    it('offers to remove what any of the sources wrote and no longer carries', () => {
        const gone: ExistingResource = {
            place: 'environment',
            route: 'viejo',
            name: 'viejo',
            origin: environment,
        };
        const plan = importPlan(
            [resource('collection', collection), resource('environment', environment)],
            [gone],
            () => 'minted',
        );

        expect(plan.entries.map(({ class: kind, route }) => `${kind}:${route}`)).toEqual([
            'add:minted',
            'add:local',
            'removal:viejo',
        ]);
    });
});
