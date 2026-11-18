import { describe, expect, it } from 'vitest';

import { redirectedRequest } from '../../src/redirect/redirected-request.js';
import type { SyncRequest } from '../../src/request/sync-request.js';

const ABC = new TextEncoder().encode('abc');

function post(headers: SyncRequest['headers'], keepMethod?: boolean): SyncRequest {
    return {
        body: ABC,
        headers,
        method: 'POST',
        redirects: { follow: true, keepMethod, max: 5 },
        spill: { open: () => Promise.reject(new Error('no spill')), thresholdBytes: 1024 },
        timeouts: { connectMs: 1_000, totalMs: 5_000 },
        tls: { verify: false },
        url: 'http://127.0.0.1:9000/form',
    };
}

describe('the method and body a redirect carries on', () => {
    it('drops every header that describes the body when the body leaves', () => {
        const from = post([
            ['Content-Encoding', 'gzip'],
            ['content-language', 'es'],
            ['content-location', '/draft'],
            ['x-keep', 'yes'],
        ]);

        expect(redirectedRequest(from, 303, '/next').request.headers).toEqual([['x-keep', 'yes']]);
    });

    it.each([301, 302])('keeps method and body through a %s when the request says so', (status) => {
        const { request: next } = redirectedRequest(
            post([['content-type', 'text/plain']], true),
            status,
            '/next',
        );

        expect(next.method).toBe('POST');
        expect(next.body).toEqual(ABC);
        expect(next.headers).toEqual([['content-type', 'text/plain']]);
    });

    it('turns a 303 into a GET even when the request keeps its method', () => {
        expect(redirectedRequest(post([], true), 303, '/next').request.method).toBe('GET');
    });
});
