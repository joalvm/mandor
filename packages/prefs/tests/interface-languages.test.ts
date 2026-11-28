import { LANGUAGE_CODES } from '@mandor/i18n';
import { INTERFACE_LANGUAGES } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

/**
 * The picker reads its languages from a table and the messages come from a folder per language:
 * neither can get ahead of the other, or the picker offers a language that reads in English, or a
 * translation ships that nobody can choose.
 */
describe('the languages the window can be read in', () => {
    it('offers exactly the languages that have messages', () => {
        const offered = INTERFACE_LANGUAGES.map(({ code }) => code).toSorted();

        expect(offered).toEqual([...LANGUAGE_CODES].toSorted());
    });
});
