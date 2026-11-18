import { httpResponseSchema } from '@mandor/schema';
import type { SyncResponse } from '@mandor/transport-sync';
import { describe, expect, it } from 'vitest';

import { httpResponseOf } from '../../../../src/main/request/response-of.js';

const NOW = new Date('2026-09-30T10:00:00.000Z');

/** The sizes of a body that came as it is, with heads too light to count. */
function sizesOf(bytes: number): SyncResponse['sizes'] {
    return {
        transferredBytes: bytes,
        bodyBytes: bytes,
        decoded: true,
        headerBytes: 0,
        requestHeaderBytes: 0,
        requestBodyBytes: 0,
    };
}

function syncResponse(overrides: Partial<SyncResponse> = {}): SyncResponse {
    return {
        status: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers: [['content-type', 'application/json']],
        body: { kind: 'inline', bytes: new TextEncoder().encode('{"ok":true}') },
        sizes: sizesOf(11),
        timings: { dnsMs: 1, connectMs: 2, tlsMs: 0, firstByteMs: 3, totalMs: 6, viaProxy: false },
        redirects: [],
        ...overrides,
    };
}

describe('the response that crosses the bridge', () => {
    it('keeps what the transport measured and sent, and passes the schema', () => {
        const response = httpResponseOf(syncResponse(), NOW, 'none');

        expect(httpResponseSchema.safeParse(response).success).toBe(true);
        expect(response).toMatchObject({ status: 200, statusText: 'OK', httpVersion: '1.1' });
        expect(response.headers).toEqual([['content-type', 'application/json']]);
    });

    it('keeps the connection the transport saw only when it saw one', () => {
        const network = { localAddress: '::1', localPort: 1, remoteAddress: '::1', remotePort: 2 };

        expect(httpResponseOf(syncResponse(), NOW, 'none').network).toBeUndefined();
        expect(httpResponseOf(syncResponse({ network }), NOW, 'none').network).toEqual(network);
    });

    it('carries a body that is text as text', () => {
        expect(httpResponseOf(syncResponse(), NOW, 'none').body).toEqual({
            kind: 'inline',
            encoding: 'utf8',
            text: '{"ok":true}',
        });
    });

    /** Bytes that are not utf-8 would be mangled by the bridge, which walks every answer. */
    it('carries a body that is not text as base64', () => {
        const bytes = Uint8Array.from([0xff, 0xfe, 0x00, 0x80]);
        const response = httpResponseOf(
            syncResponse({
                body: { kind: 'inline', bytes },
                sizes: sizesOf(4),
            }),
            NOW,
            'none',
        );

        expect(response.body).toEqual({
            kind: 'inline',
            encoding: 'base64',
            data: Buffer.from(bytes).toString('base64'),
        });
    });

    it('has no body when none arrived', () => {
        const response = httpResponseOf(
            syncResponse({
                body: { kind: 'inline', bytes: new Uint8Array() },
                sizes: sizesOf(0),
            }),
            NOW,
            'none',
        );

        expect(response.body).toBeNull();
    });

    it('refers to a body that went to disk, with the type the server said', () => {
        const sha256 = 'a'.repeat(64);
        const response = httpResponseOf(
            syncResponse({
                body: { kind: 'spilled', ref: sha256, bytes: 3_000_000, sha256 },
                sizes: sizesOf(3_000_000),
            }),
            NOW,
            'none',
        );

        expect(response.body).toEqual({
            kind: 'stored',
            ref: sha256,
            bytes: 3_000_000,
            contentType: 'application/json',
        });
    });

    it('calls a stored body with no type a stream of bytes', () => {
        const sha256 = 'b'.repeat(64);
        const response = httpResponseOf(
            syncResponse({
                headers: [],
                body: { kind: 'spilled', ref: sha256, bytes: 9, sha256 },
                sizes: sizesOf(9),
            }),
            NOW,
            'none',
        );

        expect(response.body).toMatchObject({ contentType: 'application/octet-stream' });
    });

    it('reads every Set-Cookie line as a cookie, attributes included', () => {
        const response = httpResponseOf(
            syncResponse({
                headers: [
                    [
                        'set-cookie',
                        'sid=abc; Path=/x; Domain=a.test; Max-Age=60; HttpOnly; Secure; SameSite=Lax',
                    ],
                    ['Set-Cookie', 'theme=dark'],
                    ['set-cookie', 'garbage'],
                ],
            }),
            NOW,
            'none',
        );

        expect(response.cookies).toEqual([
            {
                name: 'sid',
                value: 'abc',
                path: '/x',
                domain: 'a.test',
                expires: '2026-09-30T10:01:00.000Z',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            },
            { name: 'theme', value: 'dark', httpOnly: false, secure: false },
        ]);
    });
});
