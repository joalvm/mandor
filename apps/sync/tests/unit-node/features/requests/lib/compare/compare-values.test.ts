import { describe, expect, it } from 'vitest';

import { compareValues } from '../../../../../../src/renderer/features/requests/lib/compare/compare-values.js';

describe('the values of a comparison (compare-values)', () => {
    it('finds nothing when both sides are the same, whatever order the keys came in', () => {
        const value = { a: 1, b: [1, 2, { c: 'x' }], d: {}, e: [], f: null, g: true };
        const reordered = { g: true, f: null, e: [], d: {}, b: [1, 2, { c: 'x' }], a: 1 };

        expect(compareValues(value, value)).toEqual({ changes: 0, differences: 0 });
        expect(compareValues(value, reordered)).toEqual({ changes: 0, differences: 0 });
    });

    it('takes a value of the same type with other content as a change, not a difference', () => {
        expect(compareValues({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({
            changes: 1,
            differences: 0,
        });
    });

    it('takes a value that changed its type as one difference', () => {
        expect(compareValues({ a: 1, b: 2 }, { a: 1, b: '2' })).toEqual({
            changes: 0,
            differences: 1,
        });
    });

    it('tells null from every other type', () => {
        expect(compareValues({ a: null }, { a: 'x' }).differences).toBe(1);
    });

    it('counts a key that came and a key that went', () => {
        expect(compareValues({ a: 1 }, { a: 1, b: 2 }).differences).toBe(1);
        expect(compareValues({ a: 1, b: 2 }, { a: 1 }).differences).toBe(1);
    });

    it('takes a value that changed its type as a whole, once, whatever it held', () => {
        expect(compareValues({ a: { x: 1, y: 2 } }, { a: 'x' })).toEqual({
            changes: 0,
            differences: 1,
        });
        expect(compareValues([1], { 0: 1 }).differences).toBe(1);
    });

    it('walks arrays by index, up to the longer one', () => {
        expect(compareValues([1, 2], [1, 2, 3]).differences).toBe(1);
        expect(compareValues([1, 2, 3], [1, 2]).differences).toBe(1);
        expect(compareValues([1, 2], [1, 3])).toEqual({ changes: 1, differences: 0 });
    });

    it('adds up what is found deep in the value', () => {
        const expected = { list: [{ id: 1, name: 'a' }], ok: true };
        const received = { list: [{ id: 2, name: 3 }], extra: 1, ok: true };

        expect(compareValues(expected, received)).toEqual({ changes: 1, differences: 2 });
    });

    it('compares a scalar at the root', () => {
        expect(compareValues(1, 2)).toEqual({ changes: 1, differences: 0 });
        expect(compareValues(1, '1')).toEqual({ changes: 0, differences: 1 });
        expect(compareValues(null, null)).toEqual({ changes: 0, differences: 0 });
    });
});
