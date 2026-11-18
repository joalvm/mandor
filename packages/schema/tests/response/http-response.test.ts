import { describe, expect, it } from 'vitest';

import { httpResponseSchema } from '../../src/response/http-response.js';

const response = {
    status: 200,
    statusText: 'OK',
    httpVersion: '2',
    headers: [
        ['content-type', 'application/json'],
        ['set-cookie', 'a=1'],
        ['set-cookie', 'b=2'],
    ],
    body: { kind: 'inline', encoding: 'utf8', text: '{}' },
    sizes: { transferredBytes: 40, bodyBytes: 2, decoded: true },
    timings: { dnsMs: 1, connectMs: 2, tlsMs: 3, firstByteMs: 4, totalMs: 12, viaProxy: false },
    redirects: [
        {
            status: 302,
            from: 'http://a.test/x',
            to: 'http://a.test/y',
            strippedHeaders: ['authorization'],
        },
    ],
    cookies: [
        { name: 'a', value: '1', httpOnly: true, secure: false },
        {
            name: 'b',
            value: '2',
            domain: 'a.test',
            path: '/',
            expires: '2030-01-01T00:00:00.000Z',
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
        },
    ],
};

describe('httpResponseSchema', () => {
    it('reads a response and writes it back the same', () => {
        const parsed = httpResponseSchema.parse(response);

        expect(parsed).toEqual(response);
        expect(httpResponseSchema.parse(parsed)).toEqual(parsed);
    });

    it('keeps repeated headers as separate rows, in the order they came', () => {
        const parsed = httpResponseSchema.parse(response);

        expect(parsed.headers.filter(([name]) => name === 'set-cookie')).toEqual([
            ['set-cookie', 'a=1'],
            ['set-cookie', 'b=2'],
        ]);
    });

    it('keeps the errors a graphql answer carried, and takes one without them', () => {
        const errors = { count: 3, messages: ['a', 'b'] };

        expect(
            httpResponseSchema.parse({ ...response, graphqlErrors: errors }).graphqlErrors,
        ).toEqual(errors);
        expect(httpResponseSchema.parse(response).graphqlErrors).toBeUndefined();
    });

    it('takes a response with no body', () => {
        expect(httpResponseSchema.parse({ ...response, body: null }).body).toBeNull();
    });

    it('refuses an http version it does not name', () => {
        expect(httpResponseSchema.safeParse({ ...response, httpVersion: '3' }).success).toBe(false);
    });

    it('refuses a status that is not an http status', () => {
        expect(httpResponseSchema.safeParse({ ...response, status: 99 }).success).toBe(false);
        expect(httpResponseSchema.safeParse({ ...response, status: 600 }).success).toBe(false);
    });

    it('refuses a negative duration', () => {
        const timings = { ...response.timings, dnsMs: -1 };

        expect(httpResponseSchema.safeParse({ ...response, timings }).success).toBe(false);
    });

    it('refuses a field it does not know', () => {
        expect(httpResponseSchema.safeParse({ ...response, extra: 1 }).success).toBe(false);
    });
});
