import { describe, expect, it } from 'vitest';

import { importPlan } from '../../src/plan/import-plan.js';
import { placeCollection } from '../../src/plan/place-collection.js';
import type { ExistingResource } from '../../src/resource/existing-resource.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const origin = { kind: 'openapi', sourceId: 'tienda@1' } as const;

function resource(place: ImportResource['place'], route: string): ImportResource {
    return {
        place,
        itemKind: place === 'item' ? 'request' : null,
        route,
        name: route,
        fields: {},
        origin,
        degradations: [],
    };
}

const DOCUMENT = [
    resource('workspace', ''),
    resource('collection', 'tienda'),
    resource('folder', 'tienda/mascotas'),
    resource('item', 'tienda/mascotas/listar'),
    resource('item', 'tienda/salud'),
];

function routesOf(resources: readonly ImportResource[]): string[] {
    return resources.map((each) => each.route);
}

function mint(): string {
    return 'k3m9x2q7a4bd';
}

describe('where the collection of an import lands', () => {
    it('files a collection nobody holds under a freshly minted id', () => {
        expect(routesOf(placeCollection(DOCUMENT, [], mint))).toEqual([
            '',
            'k3m9x2q7a4bd',
            'k3m9x2q7a4bd/mascotas',
            'k3m9x2q7a4bd/mascotas/listar',
            'k3m9x2q7a4bd/salud',
        ]);
    });

    it('lands on the collection the same document wrote, even after a rename', () => {
        const existing: ExistingResource[] = [
            { place: 'collection', route: 'mi-tienda', name: 'Mi tienda', origin },
        ];

        expect(routesOf(placeCollection(DOCUMENT, existing, mint))).toEqual([
            '',
            'mi-tienda',
            'mi-tienda/mascotas',
            'mi-tienda/mascotas/listar',
            'mi-tienda/salud',
        ]);
    });

    it('mints its own id beside a collection someone else holds', () => {
        const existing: ExistingResource[] = [
            { place: 'collection', route: 'tienda', name: 'Tienda' },
        ];

        expect(routesOf(placeCollection(DOCUMENT, existing, mint))).toEqual([
            '',
            'k3m9x2q7a4bd',
            'k3m9x2q7a4bd/mascotas',
            'k3m9x2q7a4bd/mascotas/listar',
            'k3m9x2q7a4bd/salud',
        ]);
    });

    it('draws the id only when the collection has no home yet', () => {
        const existing: ExistingResource[] = [
            { place: 'collection', route: 'mi-tienda', name: 'Mi tienda', origin },
        ];
        let drawn = 0;

        placeCollection(DOCUMENT, existing, () => {
            drawn += 1;

            return 'unused';
        });

        expect(drawn).toBe(0);
    });

    it('moves only what sits under the collection', () => {
        const existing: ExistingResource[] = [
            { place: 'collection', route: 'tienda', name: 'Tienda' },
        ];
        const outside = resource('item', 'tiendas/listar');

        expect(
            placeCollection([resource('collection', 'tienda'), outside], existing, mint)[1],
        ).toBe(outside);
    });

    it('leaves a document with no collection as it came', () => {
        const resources = [resource('workspace', '')];

        expect(placeCollection(resources, [], mint)).toBe(resources);
    });

    it('never plans a conflict over a collection a person made', () => {
        const plan = importPlan(
            DOCUMENT,
            [
                { place: 'collection', route: 'tienda', name: 'Tienda' },
                { place: 'folder', route: 'tienda/mascotas', name: 'Mascotas' },
            ],
            mint,
        );

        expect(plan.entries.filter((entry) => entry.class === 'conflict')).toEqual([]);
        expect(plan.entries.filter((entry) => entry.class === 'removal')).toEqual([]);
    });
});
