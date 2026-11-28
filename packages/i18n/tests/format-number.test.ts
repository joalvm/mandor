import { describe, expect, it } from 'vitest';

import { formatNumber } from '../src/format-number.js';

describe('a number in the language of the window', () => {
    it('writes the decimal mark and the grouping of the language', () => {
        expect(formatNumber(12_345.6, 'en', 1)).toBe('12,345.6');
        expect(formatNumber(12_345.6, 'es', 1)).toBe('12.345,6');
        expect(formatNumber(12_345.6, 'ru', 1)).toBe('12\u00a0345,6');
    });

    it('leaves a four-digit number ungrouped', () => {
        expect(formatNumber(1023, 'en')).toBe('1023');
    });

    it('keeps a fixed count of decimals, or drops the ones that trail', () => {
        expect(formatNumber(1, 'en', 1)).toBe('1.0');
        expect(formatNumber(0.5, 'en', 2, 0)).toBe('0.5');
        expect(formatNumber(2, 'en', 2, 0)).toBe('2');
    });
});
