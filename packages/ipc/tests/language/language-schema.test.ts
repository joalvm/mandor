import { describe, expect, it } from 'vitest';

import { languageSchema } from '../../src/language/language-schema.js';

describe('languageSchema', () => {
    it('accepts the languages the interface ships with', () => {
        expect(languageSchema.parse('en')).toBe('en');
        expect(languageSchema.parse('es')).toBe('es');
    });

    it('rejects a language nobody translated to', () => {
        expect(languageSchema.safeParse('fr').success).toBe(false);
    });
});
