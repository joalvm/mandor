import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import type { SyncRequest } from '../../src/request/sync-request.js';
import { sendRequest } from '../../src/send/send-request.js';
import { headersForUrl } from '../../src/url/url-authorization.js';

const BASIC_USER_SECRET = `Basic ${Buffer.from('user:se cret').toString('base64')}`;

let server: Server | undefined;

afterEach(async () => {
    await new Promise((resolve) => {
        server?.close(resolve);
    });
});

function request(url: string): SyncRequest {
    return {
        method: 'GET',
        url,
        headers: [],
        spill: {
            open: () => Promise.reject(new Error('the spill must not open')),
            thresholdBytes: 1 << 20,
        },
        timeouts: { connectMs: 2_000, totalMs: 5_000 },
        tls: { verify: false },
        redirects: { follow: true, max: 5 },
    };
}

/** A server that answers 200 and keeps the head of what reached it. */
async function listening(seen: IncomingHttpHeaders[]): Promise<number> {
    server = createServer((incoming, response) => {
        seen.push(incoming.headers);
        response.end('ok');
    });

    await new Promise<void>((resolve) => {
        server?.listen(0, '127.0.0.1', resolve);
    });

    return (server.address() as AddressInfo).port;
}

describe('the credentials a URL carries', () => {
    it('reach the server as the Basic authorization they stand for', async () => {
        const seen: IncomingHttpHeaders[] = [];
        const port = await listening(seen);

        await sendRequest(
            request(`http://user:se%20cret@127.0.0.1:${String(port)}/`),
            new AbortController().signal,
        );

        expect(seen[0]?.authorization).toBe(BASIC_USER_SECRET);
    });

    it('give way to an authorization the request wrote, in any casing', () => {
        const headers = [['AUTHORIZATION', 'Bearer mine']] as const;

        expect(headersForUrl(headers, new URL('http://user:secret@a.test/'))).toEqual(headers);
    });

    it('add nothing when the URL carries none', () => {
        expect(headersForUrl([], new URL('http://a.test/'))).toEqual([]);
    });

    it('count a user with no password', () => {
        expect(headersForUrl([], new URL('http://user@a.test/'))).toEqual([
            ['authorization', `Basic ${Buffer.from('user:').toString('base64')}`],
        ]);
    });

    it('take as written a percent sign that encodes nothing', () => {
        expect(headersForUrl([], new URL('http://100%25:%zz@a.test/'))).toEqual([
            ['authorization', `Basic ${Buffer.from('100%:%zz').toString('base64')}`],
        ]);
    });
});
