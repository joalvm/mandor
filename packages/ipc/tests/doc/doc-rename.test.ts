import { describe, expect, it } from 'vitest';

import { docRenameRequestSchema } from '../../src/index.js';

describe('the doc:rename request', () => {
    it('accepts the file name of one doc and the title it takes', () => {
        const parsed = docRenameRequestSchema.parse({
            workspaceId: 'eventos-de-pagos',
            name: 'readme.md',
            title: 'Guía',
        });

        expect(parsed).toEqual({
            workspaceId: 'eventos-de-pagos',
            name: 'readme.md',
            title: 'Guía',
        });
    });

    /** The doc is addressed by its file, and the title is a name a person reads. */
    it('rejects a doc that is not one markdown file, and a blank title', () => {
        const wrong = [
            { name: '../fuera.md', title: 'Guía' },
            { name: 'sub/guia.md', title: 'Guía' },
            { name: 'readme.md', title: '  ' },
        ];

        for (const request of wrong) {
            expect(
                docRenameRequestSchema.safeParse({ workspaceId: 'eventos', ...request }).success,
            ).toBe(false);
        }
    });
});
