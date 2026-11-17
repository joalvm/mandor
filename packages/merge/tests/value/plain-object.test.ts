import { describe, expect, it } from 'vitest';

import { isObject, ownValue } from '../../src/value/plain-object.js';

describe('plain objects', () => {
    it('tells a record from a list, a scalar and nothing', () => {
        expect(isObject({ a: 1 })).toBe(true);
        expect(isObject([])).toBe(false);
        expect(isObject(null)).toBe(false);
        expect(isObject('text')).toBe(false);
        expect(isObject(undefined)).toBe(false);
    });

    it('reads only what the object owns, never what the prototype lends', () => {
        expect(ownValue({ a: 1 }, 'a')).toBe(1);
        expect(ownValue({ a: 1 }, 'b')).toBeUndefined();
        expect(ownValue({}, 'constructor')).toBeUndefined();
    });
});
