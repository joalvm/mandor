import { describe, expect, it } from 'vitest';

import { requestBodySaveRequestSchema, requestBodySaveResultSchema } from '../../src/index.js';

describe('the request of request:body-save', () => {
    it('saves a body that went to disk by its reference', () => {
        const save = { ref: 'c'.repeat(64), suggestedName: 'big.bin' };

        expect(requestBodySaveRequestSchema.parse(save)).toEqual(save);
    });

    it('saves a body that stayed in memory, as text or as base64', () => {
        const text = { encoding: 'utf8', text: '{}', suggestedName: 'a.json' };
        const data = { encoding: 'base64', data: 'AAE=', suggestedName: 'a.bin' };

        expect(requestBodySaveRequestSchema.parse(text)).toEqual(text);
        expect(requestBodySaveRequestSchema.parse(data)).toEqual(data);
    });

    it('refuses a reference that is a path', () => {
        expect(
            requestBodySaveRequestSchema.safeParse({ ref: '../x', suggestedName: 'a' }).success,
        ).toBe(false);
    });

    it('refuses a name that is empty', () => {
        expect(
            requestBodySaveRequestSchema.safeParse({ ref: 'c'.repeat(64), suggestedName: '' })
                .success,
        ).toBe(false);
    });

    it('answers where it saved, or null when the user closed the dialog', () => {
        expect(requestBodySaveResultSchema.parse({ ok: true, value: { path: null } })).toEqual({
            ok: true,
            value: { path: null },
        });
    });
});
