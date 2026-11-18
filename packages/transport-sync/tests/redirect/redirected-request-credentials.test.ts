import { describe, expect, it } from 'vitest';

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

describe('the credentials a redirect carries', () => {
    it('strips the credential headers on a cross-origin hop and names them', () => {
        const from = request(sameOrigin, {
            headers: [
                ['authorization', 'Bearer t'],
                ['cookie', 'a=1'],
                ['x-keep', 'yes'],
            ],
        });

        const { request: next, strippedHeaders } = redirectedRequest(from, 302, otherOrigin);

        expect(next.headers).toEqual([['x-keep', 'yes']]);
        expect(strippedHeaders).toEqual(['authorization', 'cookie']);
    });

    /** Postman's `followAuthorizationHeader`: the token goes along, the cookies stay behind. */
    it('keeps Authorization on a cross-origin hop when the request keeps it', () => {
        const from = request(sameOrigin, {
            headers: [
                ['Authorization', 'Bearer t'],
                ['cookie', 'a=1'],
                ['proxy-authorization', 'Basic p'],
            ],
            redirects: { follow: true, max: 5, keepAuthorization: true },
        });

        const { request: next, strippedHeaders } = redirectedRequest(from, 302, otherOrigin);

        expect(next.headers).toEqual([['Authorization', 'Bearer t']]);
        expect(strippedHeaders).toEqual(['cookie', 'proxy-authorization']);
    });

    it('keeps the credential headers on a same-origin hop', () => {
        const from = request(sameOrigin, {
            headers: [
                ['authorization', 'Bearer t'],
                ['cookie', 'a=1'],
            ],
        });

        const { request: next, strippedHeaders } = redirectedRequest(from, 302, '/next');

        expect(strippedHeaders).toEqual([]);
        expect(next.headers).toEqual(from.headers);
    });
});
