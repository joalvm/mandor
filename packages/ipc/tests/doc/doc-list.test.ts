import { describe, expect, it } from 'vitest';

import { docListResultSchema } from '../../src/index.js';

describe('the doc:list result', () => {
    it('carries each doc as its file name and its title', () => {
        const listed = [{ name: 'k3m9x2q7a4bd.md', title: 'Guía de uso' }];

        expect(docListResultSchema.parse({ ok: true, value: listed })).toEqual({
            ok: true,
            value: listed,
        });
    });

    it('rejects a doc whose file name is not one markdown file', () => {
        const wrong = { ok: true, value: [{ name: '../fuera', title: 'Fuera' }] };

        expect(docListResultSchema.safeParse(wrong).success).toBe(false);
    });
});
