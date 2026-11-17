import { describe, expect, it } from 'vitest';

import { headSizesOf } from '../../src/send/head-sizes.js';
import type { SyncRequest } from '../../src/request/sync-request.js';

function request(overrides: Partial<SyncRequest> = {}): SyncRequest {
    return {
        method: 'GET',
        url: 'http://a.test/one?two=3',
        headers: [['accept', '*/*']],
        ...overrides,
    } as SyncRequest;
}

const head = { status: 200, statusText: 'OK', headers: [['x-one', 'first']] as const };

describe('headSizesOf', () => {
    it('counts the response head as status line, header lines and the closing blank line', () => {
        // "HTTP/1.1 200 OK\r\n" + "x-one: first\r\n" + "\r\n"
        expect(headSizesOf(request(), head).headerBytes).toBe(17 + 14 + 2);
    });

    it('counts the request line, the host line and the request headers', () => {
        // "GET /one?two=3 HTTP/1.1\r\n" + "host: a.test\r\n" + "accept: */*\r\n" + "\r\n"
        const sizes = headSizesOf(request(), head);

        expect(sizes.requestHeaderBytes).toBe(25 + 14 + 13 + 2);
        expect(sizes.requestBodyBytes).toBe(0);
    });

    it('adds the content-length line and the body bytes when the request carries a body', () => {
        const body = new TextEncoder().encode('{"a":1}');
        const sizes = headSizesOf(request({ method: 'POST', body, headers: [] }), head);

        // "POST /one?two=3 HTTP/1.1\r\n" + "host: a.test\r\n" + "content-length: 7\r\n" + "\r\n"
        expect(sizes.requestHeaderBytes).toBe(26 + 14 + 19 + 2);
        expect(sizes.requestBodyBytes).toBe(7);
    });

    it('counts multibyte header values by their utf-8 bytes', () => {
        const sizes = headSizesOf(request(), { ...head, headers: [['x', 'ñ']] });

        // "x: ñ\r\n" is 7 bytes: ñ takes two.
        expect(sizes.headerBytes).toBe(17 + 7 + 2);
    });
});
