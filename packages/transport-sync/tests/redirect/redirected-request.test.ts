import { describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import { redirectedRequest } from '../../src/redirect/redirected-request.js';
import type { SyncRequest } from '../../src/request/sync-request.js';

function request(url: string, overrides: Partial<SyncRequest> = {}): SyncRequest {
    const base: SyncRequest = {
        method: 'GET',
        url,
        headers: [],
        spill: {
            open: () => Promise.reject(new Error('the spill must not open')),
            thresholdBytes: 1 << 20,
        },
        timeouts: { connectMs: 1_000, totalMs: 5_000 },
        tls: { verify: false },
        redirects: { follow: true, max: 5 },
    };

    return Object.assign(base, overrides);
}

const sameOrigin = 'http://127.0.0.1:9000/one';
const otherOrigin = 'http://127.0.0.1:9001/two';

describe('redirectedRequest', () => {
    it('resolves a relative location against the previous URL', () => {
        const { request: next } = redirectedRequest(request(sameOrigin), 302, '/next');

        expect(next.url).toBe('http://127.0.0.1:9000/next');
    });

    it('resolves an absolute location on another origin', () => {
        const { request: next } = redirectedRequest(request(sameOrigin), 302, otherOrigin);

        expect(next.url).toBe(otherOrigin);
    });

    it('refuses a location that does not parse as a URL with redirect-scheme', () => {
        expect(() => redirectedRequest(request(sameOrigin), 302, 'http://[')).toThrow(
            SyncSendError,
        );

        try {
            redirectedRequest(request(sameOrigin), 302, 'http://[');
        } catch (error) {
            expect((error as SyncSendError).reason).toBe('redirect-scheme');
        }
    });

    it.each(['file:///etc/passwd', 'ftp://example.com/x', 'javascript:alert(1)'])(
        'refuses the %s location with redirect-scheme',
        (location) => {
            expect(() => redirectedRequest(request(sameOrigin), 302, location)).toThrow(
                SyncSendError,
            );

            try {
                redirectedRequest(request(sameOrigin), 302, location);
            } catch (error) {
                expect((error as SyncSendError).reason).toBe('redirect-scheme');
            }
        },
    );

    it('follows a https to http hop, as a change of origin', () => {
        const from = {
            ...request('https://127.0.0.1:9000/one'),
            headers: [['Authorization', 'Bearer a']] as [string, string][],
        };
        const hop = redirectedRequest(from, 302, 'http://127.0.0.1:9000/two');

        expect(hop.request.url).toBe('http://127.0.0.1:9000/two');
        expect(hop.strippedHeaders).toEqual(['authorization']);
    });

    it('follows a location with credentials in it', () => {
        expect(
            redirectedRequest(request(sameOrigin), 302, 'http://user:secret@127.0.0.1:9001/')
                .request.url,
        ).toBe('http://user:secret@127.0.0.1:9001/');
    });

    it('keeps http to https and https to https without complaint', () => {
        expect(
            redirectedRequest(request('http://a.test/x'), 301, 'https://a.test/y').request.url,
        ).toBe('https://a.test/y');
        expect(
            redirectedRequest(request('https://a.test/x'), 301, 'https://a.test/y').request.url,
        ).toBe('https://a.test/y');
    });

    it.each([301, 302, 303])('turns a %s of a POST into a bodyless GET', (status) => {
        const from = request(sameOrigin, {
            method: 'POST',
            headers: [
                ['content-type', 'text/plain'],
                ['content-length', '3'],
            ],
            body: new TextEncoder().encode('abc'),
        });

        const { request: next } = redirectedRequest(from, status, '/next');

        expect(next.method).toBe('GET');
        expect(next.body).toBeUndefined();
        expect(next.headers.map(([name]) => name.toLowerCase())).not.toContain('content-length');
        expect(next.headers.map(([name]) => name.toLowerCase())).not.toContain('content-type');
    });

    it('keeps a HEAD through a 303', () => {
        const { request: next } = redirectedRequest(
            request(sameOrigin, { method: 'HEAD' }),
            303,
            '/next',
        );

        expect(next.method).toBe('HEAD');
    });

    it.each([307, 308])('keeps method and body through a %s', (status) => {
        const body = new TextEncoder().encode('abc');
        const from = request(sameOrigin, {
            method: 'POST',
            headers: [
                ['content-type', 'text/plain'],
                ['content-length', '3'],
            ],
            body,
        });

        const { request: next } = redirectedRequest(from, status, '/next');

        expect(next.method).toBe('POST');
        expect(next.body).toEqual(body);
        expect(next.headers.map(([name]) => name.toLowerCase())).toContain('content-length');
    });
});
