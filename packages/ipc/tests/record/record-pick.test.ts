import { describe, expect, it } from 'vitest';

import { recordPickRequestSchema, recordPickResultSchema } from '../../src/index.js';

describe('the request of the recording save dialog', () => {
    it('takes a name to suggest to the user', () => {
        expect(recordPickRequestSchema.parse({ suggestedName: 'echo.jsonl' })).toEqual({
            suggestedName: 'echo.jsonl',
        });
    });

    it('refuses a name that is empty', () => {
        expect(recordPickRequestSchema.safeParse({ suggestedName: '' }).success).toBe(false);
    });

    /** `null` is the user closing the dialog, which is an answer and not a failure. */
    it('answers a path that can be null', () => {
        expect(recordPickResultSchema.parse({ ok: true, value: { path: null } })).toEqual({
            ok: true,
            value: { path: null },
        });
    });
});
