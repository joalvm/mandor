import { describe, expect, it } from 'vitest';

import { docWriteRequestSchema } from '../../src/doc/doc-write.js';

describe('docWriteRequestSchema', () => {
    it('carries the whole text of the doc', () => {
        const request = { workspaceId: 'api-pagos', name: 'Notas.md', text: '# Notas\n' };

        expect(docWriteRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts an empty document: emptying a doc is a write like any other', () => {
        const result = docWriteRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            name: 'Notas.md',
            text: '',
        });

        expect(result.success).toBe(true);
    });

    it('refuses a request with no text', () => {
        const result = docWriteRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            name: 'Notas.md',
        });

        expect(result.success).toBe(false);
    });

    it('refuses a name that would leave the docs folder', () => {
        const result = docWriteRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            name: '..\\Notas.md',
            text: 'x',
        });

        expect(result.success).toBe(false);
    });
});
