import { describe, expect, it } from 'vitest';

import { maskOf } from '../src/lib/secret-mask.js';

describe('the mask a hidden value wears', () => {
    it('says there is something, one dot per character', () => {
        expect(maskOf('hx7_qW2mRt')).toBe('••••••••••');
    });

    it('never goes under the floor: a short secret still reads as something', () => {
        expect(maskOf('abc')).toBe('••••••');
        expect(maskOf('')).toBe('••••••');
    });

    it('never says the exact length of a long one', () => {
        expect(maskOf('a'.repeat(40))).toBe('•'.repeat(14));
    });
});
