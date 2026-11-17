import { describe, expect, it } from 'vitest';

import { docNameSchema } from '../../src/doc/doc-name-schema.js';

describe('docNameSchema', () => {
    it.each(['notas.md', 'Notas de la API.md', 'Guía de inicio.md'])('accepts %s', (name) => {
        expect(docNameSchema.parse(name)).toBe(name);
    });

    it.each([
        'notas.txt',
        '.md',
        '.oculto.md',
        '../notas.md',
        'a/notas.md',
        'a\\notas.md',
        'a:b.md',
    ])('refuses %j before it can reach a join', (name) => {
        expect(docNameSchema.safeParse(name).success).toBe(false);
    });

    it('refuses a name longer than a file name can be', () => {
        expect(docNameSchema.safeParse(`${'a'.repeat(253)}.md`).success).toBe(false);
    });

    it('says what is wrong with it', () => {
        const result = docNameSchema.safeParse('notas.txt');

        expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
            'Not a doc file name',
        ]);
    });

    it('refuses what is not text', () => {
        expect(docNameSchema.safeParse(3).success).toBe(false);
    });
});
