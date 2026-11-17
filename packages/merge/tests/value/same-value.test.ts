import { describe, expect, it } from 'vitest';

import { sameValue } from '../../src/value/same-value.js';

describe('deep equality of JSON values', () => {
    it('compares scalars by value and by type', () => {
        expect(sameValue('a', 'a')).toBe(true);
        expect(sameValue(1, 1)).toBe(true);
        expect(sameValue(1, '1')).toBe(false);
        expect(sameValue(null, undefined)).toBe(false);
    });

    it('walks lists in order and by length', () => {
        expect(sameValue([1, [2]], [1, [2]])).toBe(true);
        expect(sameValue([1, 2], [2, 1])).toBe(false);
        expect(sameValue([1], [1, 2])).toBe(false);
        expect(sameValue([], {})).toBe(false);
    });

    it('walks objects without caring about the order of the keys', () => {
        expect(sameValue({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 })).toBe(true);
        expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
        expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        expect(sameValue({ a: undefined }, { b: undefined })).toBe(false);
        expect(sameValue({ a: 1 }, null)).toBe(false);
    });
});
