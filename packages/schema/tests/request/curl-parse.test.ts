import { describe, expect, it } from 'vitest';

import { curlParseSchema, curlSettingsSchema } from '../../src/request/curl-parse.js';

const REQUEST = {
    method: 'POST',
    url: 'https://example.test/a',
    query: [],
    headers: [{ key: 'Accept', value: '*/*', enabled: true }],
    body: { type: 'json', content: '{"a":1}' },
    settings: {},
};

describe('the settings a curl names', () => {
    it('keeps only what is named, with no default filled in', () => {
        expect(curlSettingsSchema.parse({})).toEqual({});
        expect(curlSettingsSchema.parse({ validateTls: false })).toEqual({ validateTls: false });
    });

    it('refuses a value the request would refuse', () => {
        expect(curlSettingsSchema.safeParse({ timeoutMs: 0 }).success).toBe(false);
        expect(curlSettingsSchema.safeParse({ maxRedirects: -1 }).success).toBe(false);
        expect(curlSettingsSchema.safeParse({ retries: 3 }).success).toBe(false);
    });
});

describe('the result of reading a curl', () => {
    it('reads a request with its notices', () => {
        const parsed = curlParseSchema.parse({
            kind: 'parsed',
            request: REQUEST,
            notices: [{ code: 'comment' }],
        });

        expect(parsed.kind).toBe('parsed');
    });

    it('keeps the settings empty when the curl named none', () => {
        const parsed = curlParseSchema.parse({ kind: 'parsed', request: REQUEST, notices: [] });

        expect(parsed.kind === 'parsed' && parsed.request.settings).toEqual({});
    });

    it('reads a basic auth', () => {
        const auth = { type: 'basic', username: 'ana', password: '' };

        expect(
            curlParseSchema.safeParse({
                kind: 'parsed',
                request: { ...REQUEST, auth },
                notices: [],
            }).success,
        ).toBe(true);
    });

    it('refuses a lower-case method', () => {
        expect(
            curlParseSchema.safeParse({
                kind: 'parsed',
                request: { ...REQUEST, method: 'get' },
                notices: [],
            }).success,
        ).toBe(false);
    });

    it('reads the reason a paste is not read', () => {
        expect(curlParseSchema.parse({ kind: 'invalid', reason: 'noUrl' })).toEqual({
            kind: 'invalid',
            reason: 'noUrl',
        });
        expect(curlParseSchema.safeParse({ kind: 'invalid', reason: 'other' }).success).toBe(false);
    });
});
