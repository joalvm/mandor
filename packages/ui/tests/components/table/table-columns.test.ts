import { describe, expect, it } from 'vitest';

import {
    resizedWeights,
    tableTemplateOf,
    type TableColumn,
} from '../../../src/components/table/table-columns.js';

const PAIRS: readonly TableColumn[] = [
    { id: 'check', kind: 'fixed', size: 'check' },
    { id: 'key', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'value', kind: 'fluid', min: 'md', weight: 2 },
    { id: 'description', kind: 'fluid', min: 'lg', weight: 1 },
];

describe('the grid a table lays its cells on', () => {
    it('gives a fixed column its control and a fluid one its least width and its share', () => {
        expect(tableTemplateOf(PAIRS, {})).toBe(
            'calc(var(--mandor-height-field) - 2 * var(--mandor-gap-tight)) ' +
                'minmax(9rem, 1fr) minmax(9rem, 2fr) ' +
                'minmax(max(12rem, calc(var(--table-tools-width, 0px) + 4rem)), 1fr)',
        );
    });

    /** The tools of the head lie over the end of the last column, and its name ends where they begin. */
    it('keeps the last column wide enough for the tools of the head and its name beside them', () => {
        expect(
            tableTemplateOf(PAIRS, {}).endsWith(
                'minmax(max(12rem, calc(var(--table-tools-width, 0px) + 4rem)), 1fr)',
            ),
        ).toBe(true);
    });

    it('takes the share a drag left in place of the one the column starts with', () => {
        expect(tableTemplateOf(PAIRS, { value: 2.5 })).toContain('minmax(9rem, 2.5fr)');
    });
});

describe('dragging the edge between two columns', () => {
    /** The key stands 200px wide on one share: 100px of drag is half a share. */
    it('gives one side what it takes from the other, so the rest of the table stays put', () => {
        const weights = resizedWeights(PAIRS, {}, { deltaX: 100, id: 'key', width: 200 });

        expect(weights).toEqual({ key: 1.5, value: 1.5 });
    });

    it('never squeezes a column out of the table', () => {
        const wider = resizedWeights(PAIRS, {}, { deltaX: 10_000, id: 'key', width: 200 });
        const narrower = resizedWeights(PAIRS, {}, { deltaX: -10_000, id: 'key', width: 200 });

        expect(wider['value']).toBeCloseTo(0.2, 5);
        expect(wider['key']).toBeCloseTo(2.8, 5);
        expect(narrower['key']).toBeCloseTo(0.2, 5);
        expect(narrower['value']).toBeCloseTo(2.8, 5);
    });

    it('moves nothing from the last column, whose edge is the frame', () => {
        const weights = { value: 2 };

        expect(resizedWeights(PAIRS, weights, { deltaX: 50, id: 'description', width: 200 })).toBe(
            weights,
        );
    });

    it('moves nothing from a fixed column, which is as wide as its control', () => {
        const weights = {};

        expect(resizedWeights(PAIRS, weights, { deltaX: 50, id: 'check', width: 24 })).toBe(
            weights,
        );
    });

    it('moves nothing while the column has no width to measure the drag by', () => {
        const weights = {};

        expect(resizedWeights(PAIRS, weights, { deltaX: 50, id: 'key', width: 0 })).toBe(weights);
    });
});
