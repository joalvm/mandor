import { describe, expect, it } from 'vitest';

import { formatModified } from '../src/lib/format-modified.js';

describe('the modified column of one workspace', () => {
    it('reads the day and the month, short, in the language of the window', () => {
        const when = new Date(new Date().getFullYear(), 8, 20).toISOString();

        expect(formatModified(when, 'en')).toMatch(/Sep/);
        expect(formatModified(when, 'es')).toMatch(/sept/);
    });

    /** A year repeated in every row of the table says nothing the rows do not already share. */
    it('says the year only when it is not this one', () => {
        const when = new Date(new Date().getFullYear() - 1, 8, 20).toISOString();

        expect(formatModified(when, 'en')).toMatch(/20\d\d/);
    });

    it('says nothing was ever touched with a dash, not a date that guesses', () => {
        expect(formatModified(null, 'en')).toBe('—');
    });
});
