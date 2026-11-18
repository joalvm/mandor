import { describe, expect, it } from 'vitest';

import { importPlan } from '../../src/plan/import-plan.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const origin = { kind: 'asyncapi', sourceId: 'pasarela@1' } as const;

function resource(): ImportResource {
    return {
        place: 'item',
        itemKind: 'message',
        route: 'pedidos/pedido-creado',
        name: 'pedido creado',
        fields: { kind: 'message', name: 'pedido creado' },
        origin,
        degradations: [],
    };
}

describe('selecting what an update may touch', () => {
    it('starts a drifted item out of the import, because its own edits now live there', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/pedido-creado',
                    name: 'pedido creado',
                    origin: { ...origin, fingerprint: 'what-the-import-wrote' },
                    fingerprint: 'what-the-item-reads-now',
                },
            ],
            () => 'minted',
        );

        expect(plan.entries[0]?.class).toBe('update');
        expect(plan.entries[0]?.selected).toBe(false);
    });

    it('keeps an untouched item in the import, because writing over its own work loses nothing', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/pedido-creado',
                    name: 'pedido creado',
                    origin: { ...origin, fingerprint: 'what-the-import-wrote' },
                    fingerprint: 'what-the-import-wrote',
                },
            ],
            () => 'minted',
        );

        expect(plan.entries[0]?.class).toBe('update');
        expect(plan.entries[0]?.selected).toBe(true);
    });

    it('starts an item in when no fingerprint was stored, because there is nothing to compare', () => {
        const plan = importPlan(
            [resource()],
            [
                {
                    place: 'item',
                    route: 'pedidos/pedido-creado',
                    name: 'pedido creado',
                    origin,
                    fingerprint: 'what-the-item-reads-now',
                },
            ],
            () => 'minted',
        );

        expect(plan.entries[0]?.selected).toBe(true);
    });
});
