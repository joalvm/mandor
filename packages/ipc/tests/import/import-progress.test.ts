import { describe, expect, it } from 'vitest';

import { importProgressPushSchema } from '../../src/import/import-progress.js';

describe('the progress of reading what was picked', () => {
    it('counts the files read, from none', () => {
        expect(importProgressPushSchema.parse({ files: 0 })).toEqual({ files: 0 });
    });

    it('takes nothing that is not a count', () => {
        expect(importProgressPushSchema.safeParse({ files: -1 }).success).toBe(false);
        expect(importProgressPushSchema.safeParse({ files: 1, path: 'a' }).success).toBe(false);
    });
});
