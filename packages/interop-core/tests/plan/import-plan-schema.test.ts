import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { importPlan } from '../../src/plan/import-plan.js';
import { importPlanSchema } from '../../src/plan/import-plan-schema.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

const origin = { kind: 'asyncapi', sourceId: 'pasarela@1' } as const;

const resource: ImportResource = {
    place: 'item',
    itemKind: 'message',
    route: 'pedidos/pedido-creado',
    name: 'pedido creado',
    fields: { kind: 'message', name: 'pedido creado' },
    origin,
    degradations: [],
};

describe('parsing a plan of an import', () => {
    it('reads a plan with its identity and its entries, so it can cross to be shown', () => {
        const plan = importPlan([resource], [], () => 'minted');

        expect(importPlanSchema.parse(plan)).toEqual(plan);
    });

    it('reads why an app leaves a leaf out, so the reason crosses with the plan', () => {
        const plan = importPlan([resource], [], () => 'minted');
        const left = {
            ...plan,
            entries: [{ ...plan.entries[0], leftOut: degradation('leftOutConnections') }],
        };

        expect(importPlanSchema.parse(left)).toEqual(left);
    });

    it('refuses a reason with nothing to read', () => {
        const plan = importPlan([resource], [], () => 'minted');

        expect(
            importPlanSchema.safeParse({
                ...plan,
                entries: [{ ...plan.entries[0], leftOut: ' ' }],
            }).success,
        ).toBe(false);
    });

    it('reads a plan that names nobody', () => {
        const plan = importPlan([], [], () => 'minted');

        expect(importPlanSchema.parse(plan)).toEqual(plan);
    });

    it('refuses an entry class that is not one of the four differences', () => {
        const plan = importPlan([resource], [], () => 'minted');

        expect(
            importPlanSchema.safeParse({
                ...plan,
                entries: [{ ...plan.entries[0], class: 'maybe' }],
            }).success,
        ).toBe(false);
    });

    it('refuses a plan whose import lost its identity', () => {
        const plan = importPlan([resource], [], () => 'minted');

        expect(importPlanSchema.safeParse({ ...plan, identity: null }).success).toBe(false);
    });
});
