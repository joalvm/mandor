import { describe, expect, it } from 'vitest';

import { docReadRequestSchema, docReadResultSchema } from '../../src/doc/doc-read.js';

describe('docReadRequestSchema', () => {
    it('addresses a doc by its whole file name, extension included', () => {
        const request = { workspaceId: 'api-pagos', name: 'Notas de la API.md' };

        expect(docReadRequestSchema.parse(request)).toEqual(request);
    });

    it.each(['notas.txt', '../notas.md', 'a/notas.md', '.oculto.md'])('refuses %s', (name) => {
        expect(docReadRequestSchema.safeParse({ workspaceId: 'api-pagos', name }).success).toBe(
            false,
        );
    });
});

describe('docReadResultSchema', () => {
    it('answers with the text as it is on disk', () => {
        const answer = { ok: true, value: '# Notas\n' };

        expect(docReadResultSchema.parse(answer)).toEqual(answer);
    });

    it('answers a failure with a code', () => {
        const failure = { ok: false, error: { code: 'fs-read', message: 'gone' } };

        expect(docReadResultSchema.parse(failure)).toEqual(failure);
    });
});
