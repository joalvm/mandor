import http from 'node:http';
import { describe, expect, it } from 'vitest';

import { dispatchOptionsOf, encodingsOf, responseOf } from '../../src/send/hop-response.js';
import { RawResponseHandler } from '../../src/send/response-handler.js';
import type { ConnectionPhases } from '../../src/timing/connection-phases.js';

function phases(): ConnectionPhases {
    return {
        dnsMs: 1,
        connectMs: 2,
        tlsMs: 3,
        firstByteAt: 10,
        lastPhaseEndAt: 7,
        alpnProtocol: 'h2',
        network: null,
    };
}

describe('encodingsOf', () => {
    it('returns no encoding when the response names none', () => {
        expect(encodingsOf([['content-type', 'text/plain']])).toEqual([]);
    });

    it('splits one comma-separated value into its encodings', () => {
        expect(encodingsOf([['content-encoding', 'gzip, br']])).toEqual(['gzip', 'br']);
    });

    it('joins several content-encoding headers in order and trims them', () => {
        expect(
            encodingsOf([
                ['content-encoding', ' gzip '],
                ['CONTENT-ENCODING', 'br'],
            ]),
        ).toEqual(['gzip', 'br']);
    });
});

describe('responseOf', () => {
    const head = (statusText: string): RawResponseHandler => {
        const handler = new RawResponseHandler();

        handler.onResponseStart({ rawHeaders: ['x-one', 'first'] }, 200, [], statusText);

        return handler;
    };

    const body = {
        body: { kind: 'inline', bytes: Buffer.from('ok') } as const,
        sizes: { transferredBytes: 2, bodyBytes: 2, decoded: true },
    };

    const sent = (proxy?: { url: string }): Parameters<typeof responseOf>[3] => ({
        method: 'GET',
        url: 'http://a.test/',
        headers: [],
        proxy,
    });

    it('builds the response with the head, the body and the phases', () => {
        const response = responseOf(head('Fine'), phases(), body, sent());

        expect(response.status).toBe(200);
        expect(response.statusText).toBe('Fine');
        expect(response.httpVersion).toBe('2');
        expect(response.headers).toEqual([['x-one', 'first']]);
        expect(response.timings.firstByteMs).toBe(3);
        expect(response.timings.viaProxy).toBe(false);
        expect(response.redirects).toEqual([]);
        expect(response.network).toBeUndefined();
        expect(response.sizes).toMatchObject({ bodyBytes: 2, requestBodyBytes: 0 });
    });

    it('carries the network the connector saw and says when a proxy answered', () => {
        const network = { localAddress: '::1', localPort: 1, remoteAddress: '::1', remotePort: 2 };
        const response = responseOf(
            head('Fine'),
            { ...phases(), network },
            body,
            sent({ url: 'http://proxy.test' }),
        );

        expect(response.network).toEqual(network);
        expect(response.timings.viaProxy).toBe(true);
    });

    it('falls back to the well-known phrase when the head carries no status text', () => {
        const response = responseOf(head(''), { ...phases(), alpnProtocol: null }, body, sent());

        expect(response.statusText).toBe(http.STATUS_CODES[200]);
        expect(response.httpVersion).toBe('1.1');
    });
});

describe('dispatchOptionsOf', () => {
    it('carries origin, path, method and the flat header list', () => {
        const request: Parameters<typeof dispatchOptionsOf>[0] = {
            method: 'PUT',
            headers: [
                ['a', '1'],
                ['b', '2'],
            ],
        };
        const options = dispatchOptionsOf(request, new URL('http://a.test/one?two=3'));

        expect(options).toMatchObject({
            origin: 'http://a.test',
            path: '/one?two=3',
            method: 'PUT',
        });
        expect(options.headers).toEqual(['a', '1', 'b', '2']);
    });

    it('carries the body only when the request has one', () => {
        const bodyless = { method: 'GET', headers: [] };

        expect(dispatchOptionsOf(bodyless, new URL('http://a.test/')).body).toBeUndefined();

        const withBody = { method: 'POST', headers: [], body: new TextEncoder().encode('x') };

        expect(dispatchOptionsOf(withBody, new URL('http://a.test/')).body).toBeDefined();
    });
});
