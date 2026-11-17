import { describe, expect, it } from 'vitest';

import { docCreateRequestSchema, docCreateResultSchema } from '../../src/index.js';

describe('the doc:create request', () => {
    it('accepts a workspace and the title a person typed', () => {
        const parsed = docCreateRequestSchema.parse({
            workspaceId: 'eventos-de-pagos',
            title: 'Guía de uso',
        });

        expect(parsed).toEqual({ workspaceId: 'eventos-de-pagos', title: 'Guía de uso' });
    });

    /** The file name is main's to draw, so a request that names one is not a request for a doc. */
    it('rejects a request without a title, or with a blank one', () => {
        const wrong = [{ workspaceId: 'eventos' }, { workspaceId: 'eventos', title: '   ' }];

        for (const request of wrong) {
            expect(docCreateRequestSchema.safeParse(request).success).toBe(false);
        }
    });
});

describe('the doc:create result', () => {
    it('answers with the file name main drew', () => {
        expect(docCreateResultSchema.parse({ ok: true, value: 'k3m9x2q7a4bd.md' })).toEqual({
            ok: true,
            value: 'k3m9x2q7a4bd.md',
        });
    });

    it('rejects an answer that is not a markdown file name', () => {
        expect(docCreateResultSchema.safeParse({ ok: true, value: '../fuera' }).success).toBe(
            false,
        );
    });
});
