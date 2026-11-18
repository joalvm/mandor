import { describe, expect, it } from 'vitest';

import { requestBodyReadRequestSchema, requestBodyReadResultSchema } from '../../src/index.js';

const REF = 'b'.repeat(64);

describe('the request of request:body-read', () => {
    it('asks for a window of the body a reference names', () => {
        const window = { ref: REF, offset: 0, length: 262_144 };

        expect(requestBodyReadRequestSchema.parse(window)).toEqual(window);
    });

    it('never takes a path in place of the reference', () => {
        expect(
            requestBodyReadRequestSchema.safeParse({ ref: 'C:/x/y', offset: 0, length: 10 })
                .success,
        ).toBe(false);
    });

    it('refuses a window over 256 KiB, and a negative start', () => {
        expect(
            requestBodyReadRequestSchema.safeParse({ ref: REF, offset: 0, length: 262_145 })
                .success,
        ).toBe(false);
        expect(
            requestBodyReadRequestSchema.safeParse({ ref: REF, offset: -1, length: 10 }).success,
        ).toBe(false);
    });

    it('refuses an empty window', () => {
        expect(
            requestBodyReadRequestSchema.safeParse({ ref: REF, offset: 0, length: 0 }).success,
        ).toBe(false);
    });
});

describe('the answer of request:body-read', () => {
    it('gives the window as text or as base64, and the size of the whole body', () => {
        const text = { ok: true, value: { encoding: 'utf8', text: 'abc', total: 9 } };
        const data = { ok: true, value: { encoding: 'base64', data: 'AAE=', total: 9 } };

        expect(requestBodyReadResultSchema.parse(text)).toEqual(text);
        expect(requestBodyReadResultSchema.parse(data)).toEqual(data);
    });
});
