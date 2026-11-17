import { describe, expect, it } from 'vitest';

import { docRevertRequestSchema, docRevertResultSchema } from '../../src/doc/doc-revert.js';

describe('docRevertRequestSchema', () => {
    it('names the doc and nothing else: main knows what its earlier text was', () => {
        const request = { workspaceId: 'api-pagos', name: 'Notas.md' };

        expect(docRevertRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a name that is not a markdown file of the workspace', () => {
        const result = docRevertRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            name: '../Notas.md',
        });

        expect(result.success).toBe(false);
    });
});

describe('docRevertResultSchema', () => {
    it('answers with the text the doc went back to', () => {
        const answer = { ok: true, value: 'antes' };

        expect(docRevertResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a success that carries no text', () => {
        expect(docRevertResultSchema.safeParse({ ok: true }).success).toBe(false);
    });
});
