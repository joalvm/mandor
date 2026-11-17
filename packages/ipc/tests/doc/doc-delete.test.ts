import { describe, expect, it } from 'vitest';

import { docDeleteRequestSchema } from '../../src/index.js';

describe('the doc:delete request', () => {
    it('accepts the whole file name of one doc', () => {
        expect(docDeleteRequestSchema.parse({ workspaceId: 'eventos', name: 'readme.md' })).toEqual(
            { workspaceId: 'eventos', name: 'readme.md' },
        );
    });

    /** Only a doc of the folder can go: nothing else of the repo is reached through this door. */
    it('rejects a name that is not one markdown file of the folder', () => {
        for (const name of ['guia', 'guia.txt', '../fuera.md', 'sub/guia.md']) {
            expect(
                docDeleteRequestSchema.safeParse({ workspaceId: 'eventos', name }).success,
                name,
            ).toBe(false);
        }
    });
});
