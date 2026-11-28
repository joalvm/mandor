import { describe, expect, it } from 'vitest';

import {
    INTERFACE_LANGUAGES,
    textDirectionOf,
    type InterfaceLanguage,
} from '../../src/preference/interface-languages.js';

/** A language that writes from the right, in the range BCP 47 leaves for private use. */
const WITH_RIGHT_TO_LEFT: readonly InterfaceLanguage[] = [
    ...INTERFACE_LANGUAGES,
    { code: 'qaa', direction: 'rtl', name: 'Fake' },
];

describe('the interface languages', () => {
    it('name each language once, with a canonical tag', () => {
        const codes = INTERFACE_LANGUAGES.map(({ code }) => code);

        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).toEqual(codes.map((code) => Intl.getCanonicalLocales(code)[0]));
    });

    it('write the languages the table holds the way the table says', () => {
        expect(textDirectionOf('es')).toBe('ltr');
        expect(textDirectionOf('qaa', WITH_RIGHT_TO_LEFT)).toBe('rtl');
    });

    it('write a tag the table does not hold from the left', () => {
        expect(textDirectionOf('qaa')).toBe('ltr');
    });
});
