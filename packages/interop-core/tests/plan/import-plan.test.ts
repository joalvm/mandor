import { describe, expect, it } from 'vitest';

import { importPlan } from '../../src/plan/import-plan.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const origin = { kind: 'asyncapi', sourceId: 'pasarela@1' } as const;

function resource(overrides: Partial<ImportResource> = {}): ImportResource {
    return {
        place: 'item',
        itemKind: 'message',
        route: 'pedidos/pedido-creado',
        name: 'pedido creado',
        fields: { kind: 'message', name: 'pedido creado' },
        origin,
        degradations: [],
        ...overrides,
    };
}

describe('planning an import', () => {
    it('plans an add for a route nobody holds', () => {
        const plan = importPlan([resource()], [], () => 'minted');

        expect(plan.entries).toEqual([
            {
                class: 'add',
                place: 'item',
                route: 'pedidos/pedido-creado',
                name: 'pedido creado',
                resource: resource(),
                selected: true,
            },
        ]);
    });

    it('plans an update when the same source wrote what is already there', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/pedido-creado',
                    name: 'pedido creado',
                    origin,
                },
            ],
            () => 'minted',
        );

        expect(plan.entries[0]?.class).toBe('update');
    });

    it('plans a conflict when a person wrote what the route would hold', () => {
        const plan = importPlan(
            [resource()],
            [{ place: 'item', route: 'pedidos/pedido-creado', name: 'pedido creado' }],
            () => 'minted',
        );

        expect(plan.entries[0]?.class).toBe('conflict');
        expect(plan.entries[0]?.resource).toBeNull();
    });

    it('plans a conflict when another source wrote the route, and never over it', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/pedido-creado',
                    name: 'pedido creado',
                    origin: { kind: 'postman', sourceId: 'coleccion@7' },
                },
            ],
            () => 'minted',
        );

        expect(plan.entries[0]?.class).toBe('conflict');
    });

    it('plans the removal of what this source wrote and no longer carries', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/pedido-borrado',
                    name: 'pedido borrado',
                    origin,
                },
            ],
            () => 'minted',
        );

        expect(plan.entries[1]).toEqual({
            class: 'removal',
            place: 'item',
            route: 'pedidos/pedido-borrado',
            name: 'pedido borrado',
            resource: null,
            selected: false,
        });
    });

    it('leaves what another source wrote alone, even when the import no longer carries it', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/otro',
                    name: 'otro',
                    origin: { kind: 'postman', sourceId: 'coleccion@7' },
                },
            ],
            () => 'minted',
        );

        expect(plan.entries).toHaveLength(1);
        expect(plan.entries[0]?.class).toBe('add');
    });

    it('plans an update for a folder that is already there, because a folder has no origin to ask', () => {
        const plan = importPlan(
            [resource({ place: 'folder', route: 'pedidos', name: 'pedidos' })],
            [{ place: 'folder', route: 'pedidos', name: 'pedidos' }],
            () => 'minted',
        );

        expect(plan.entries[0]?.class).toBe('update');
    });

    it('names the import, so a resource says who wrote it', () => {
        const plan = importPlan([resource()], [], () => 'minted');

        expect(plan.identity).toEqual(origin);
    });

    it('names nobody when the import carries nothing, and then removes nothing either', () => {
        const plan = importPlan(
            [],
            [{ place: 'item', route: 'pedidos/pedido-creado', name: 'pedido creado', origin }],
            () => 'minted',
        );

        expect(plan.identity).toBeNull();
        expect(plan.entries).toEqual([]);
    });
});
