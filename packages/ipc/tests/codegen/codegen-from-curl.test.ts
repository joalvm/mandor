import { describe, expect, it } from 'vitest';

import {
    CURL_TEXT_MAX,
    codegenFromCurlRequestSchema,
    codegenFromCurlResultSchema,
} from '../../src/index.js';

describe('the request of codegen:from-curl', () => {
    it('is the text that was pasted', () => {
        expect(codegenFromCurlRequestSchema.safeParse({ text: 'curl https://h' }).success).toBe(
            true,
        );
    });

    it('refuses no text at all', () => {
        expect(codegenFromCurlRequestSchema.safeParse({ text: '' }).success).toBe(false);
    });

    it('takes the longest text and refuses one character more', () => {
        const text = 'x'.repeat(CURL_TEXT_MAX);

        expect(codegenFromCurlRequestSchema.safeParse({ text }).success).toBe(true);
        expect(codegenFromCurlRequestSchema.safeParse({ text: `${text}x` }).success).toBe(false);
    });

    it('refuses a key it does not know', () => {
        expect(
            codegenFromCurlRequestSchema.safeParse({ text: 'curl https://h', extra: 1 }).success,
        ).toBe(false);
    });
});

describe('the answer of codegen:from-curl', () => {
    it('carries a curl that could not be read as a result, not as a failure', () => {
        const answer = { ok: true, value: { kind: 'invalid', reason: 'noUrl' } };

        expect(codegenFromCurlResultSchema.parse(answer)).toEqual(answer);
    });

    it('carries a request with what was left out', () => {
        const answer = {
            ok: true,
            value: {
                kind: 'parsed',
                request: {
                    method: 'GET',
                    url: 'https://h',
                    query: [],
                    headers: [],
                    body: { type: 'none' },
                    settings: {},
                },
                notices: [{ code: 'comment' }],
            },
        };

        expect(codegenFromCurlResultSchema.parse(answer)).toEqual(answer);
    });
});
