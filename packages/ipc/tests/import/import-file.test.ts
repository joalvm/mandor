import { describe, expect, it } from 'vitest';

import { importFileSchema } from '../../src/import/import-file.js';

describe('a file of an import', () => {
    it('holds a relative path and the whole text, which may be empty', () => {
        const file = { path: 'environments/local.bru', text: '' };

        expect(importFileSchema.parse(file)).toEqual(file);
    });

    it('refuses a file with no path, and keys it does not know', () => {
        expect(importFileSchema.safeParse({ path: '', text: 'x' }).success).toBe(false);
        expect(importFileSchema.safeParse({ path: 'a', text: 'x', size: 1 }).success).toBe(false);
    });
});
