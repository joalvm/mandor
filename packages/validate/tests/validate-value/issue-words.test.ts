import { describe, expect, it } from 'vitest';

import { jsonTypeOf, pathOf } from '../../src/validate-value/issue-words.js';

describe('the words of an issue', () => {
    it('names a value by the type a schema gives it', () => {
        expect(jsonTypeOf(null)).toBe('null');
        expect(jsonTypeOf([])).toBe('array');
        expect(jsonTypeOf(1)).toBe('integer');
        expect(jsonTypeOf(1.5)).toBe('number');
        expect(jsonTypeOf('x')).toBe('string');
        expect(jsonTypeOf({})).toBe('object');
    });

    it('reads a pointer of the checker as a path of the value', () => {
        expect(pathOf('#')).toBe('');
        expect(pathOf('#/a/0')).toBe('/a/0');
    });
});
