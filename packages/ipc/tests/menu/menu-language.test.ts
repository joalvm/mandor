import { describe, expect, it } from 'vitest';

import { menuLanguageRequestSchema } from '../../src/menu/menu-language.js';

describe('menu:language payload', () => {
    it('accepts a language the interface speaks', () => {
        expect(menuLanguageRequestSchema.parse({ language: 'es' })).toEqual({ language: 'es' });
    });

    it('rejects a language nobody translated to', () => {
        const result = menuLanguageRequestSchema.safeParse({ language: 'fr' });

        expect(result.success).toBe(false);
    });

    it('rejects a payload that carries anything but the language', () => {
        const result = menuLanguageRequestSchema.safeParse({ language: 'es', force: true });

        expect(result.success).toBe(false);
    });
});
