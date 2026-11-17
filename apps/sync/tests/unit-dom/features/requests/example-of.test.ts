import { httpResponseSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { exampleOf } from '../../../../src/renderer/features/requests/lib/example-of.js';

function responseOf(body: unknown, statusText: string) {
    return httpResponseSchema.parse({
        status: 201,
        statusText,
        httpVersion: '1.1',
        headers: [['Content-Type', 'application/json']],
        body,
        sizes: { transferredBytes: 2, bodyBytes: 2, decoded: true },
        timings: {
            dnsMs: 0,
            connectMs: 0,
            tlsMs: 0,
            firstByteMs: 1,
            totalMs: 1,
            viaProxy: false,
        },
        redirects: [],
        cookies: [],
    });
}

describe('exampleOf', () => {
    it('keeps the status, its text, the type and the body as text', () => {
        const example = exampleOf(
            responseOf({ kind: 'inline', encoding: 'utf8', text: '{}' }, 'Created'),
        );

        expect(example).toEqual({
            body: '{}',
            contentType: 'application/json',
            headers: [['Content-Type', 'application/json']],
            name: '201 Created',
            status: '201',
        });
    });

    it('keeps the cookies the answer set, and leaves the key out when it set none', () => {
        const response = {
            ...responseOf({ kind: 'inline', encoding: 'utf8', text: '' }, 'OK'),
            cookies: [{ httpOnly: true, name: 'sid', secure: false, value: 'abc' }],
            headers: [],
        };
        const example = exampleOf(response);

        expect(example.cookies).toEqual([
            { httpOnly: true, name: 'sid', secure: false, value: 'abc' },
        ]);
        expect(example).not.toHaveProperty('headers');
    });

    it('keeps no body when it came as bytes, and names it by the status alone', () => {
        const example = exampleOf(
            responseOf({ kind: 'inline', encoding: 'base64', data: 'AAE=' }, ''),
        );

        expect(example).toMatchObject({ body: '', name: '201' });
    });
});
