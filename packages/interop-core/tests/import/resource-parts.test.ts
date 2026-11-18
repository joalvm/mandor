import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import {
    definedOnly,
    distinct,
    listOrNone,
    nameOr,
    textOf,
} from '../../src/import/resource-parts.js';

describe('definedOnly', () => {
    it('drops the keys nobody wrote and keeps the falsy ones that were written', () => {
        expect(definedOnly({ a: undefined, b: 0, c: '', d: false, e: null })).toEqual({
            b: 0,
            c: '',
            d: false,
            e: null,
        });
    });
});

describe('listOrNone', () => {
    it('says nothing of an empty list, and hands back one with something in it', () => {
        expect(listOrNone([])).toBeUndefined();
        expect(listOrNone(['a'])).toEqual(['a']);
    });
});

describe('distinct', () => {
    it('says each loss once, in the order it was first said', () => {
        const a = degradation('circularSchema', { name: 'a' });
        const b = degradation('circularSchema', { name: 'b' });
        const c = degradation('pkceAlways');

        expect(distinct([b, a, { ...b }, a, c])).toEqual([b, a, c]);
    });
});

describe('textOf', () => {
    it('is the text a document printed for a string, a number or a flag', () => {
        expect(textOf('x')).toBe('x');
        expect(textOf(3)).toBe('3');
        expect(textOf(false)).toBe('false');
    });

    it('says nothing for anything else', () => {
        expect(textOf(undefined)).toBe('');
        expect(textOf(null)).toBe('');
        expect(textOf({ a: 1 })).toBe('');
        expect(textOf([1])).toBe('');
    });
});

describe('nameOr', () => {
    it('keeps the name it was given, and falls back when the name has nothing to read', () => {
        expect(nameOr('Tienda', 'Fallback')).toBe('Tienda');
        expect(nameOr('', 'Fallback')).toBe('Fallback');
        expect(nameOr('  ', 'Fallback')).toBe('Fallback');
    });
});
