import { afterEach, describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import { sendRequest } from '../../src/send/send-request.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { type EchoServer, startEchoServer } from '../support/http-server.js';

let server: EchoServer;

afterEach(async () => {
    await server.close();
});

function request(url: string, overrides: Partial<SyncRequest> = {}): SyncRequest {
    const base: SyncRequest = {
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

    return Object.assign(base, overrides);
}

describe('sendRequest redirects over the wire', () => {
    it('follows a redirect and reports every hop, keeping the 307 body', async () => {
        server = await startEchoServer();
        const body = new TextEncoder().encode('kept');
        const to = `${server.origin}/echo`;
        const response = await sendRequest(
            request(`${server.origin}/redirect?status=307&to=${encodeURIComponent(to)}`, {
                method: 'POST',
                headers: [['content-type', 'text/plain']],
                body,
            }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(response.headers.find(([name]) => name === 'x-request-method')?.[1]).toBe('POST');
        expect(Array.from((response.body as { bytes: Uint8Array }).bytes)).toEqual(
            Array.from(body),
        );
        expect(response.redirects).toHaveLength(1);
        expect(response.redirects[0]).toMatchObject({
            status: 307,
            from: `${server.origin}/redirect?status=307&to=${encodeURIComponent(to)}`,
            to,
            strippedHeaders: [],
        });
        expect(response).not.toHaveProperty('heldAt');
    });

    it('answers the 3xx the guard holds, and says where it stopped', async () => {
        server = await startEchoServer();
        const from = `${server.origin}/redirect?status=307&to=${encodeURIComponent(`http://localhost:${new URL(server.origin).port}/echo`)}`;
        const response = await sendRequest(
            request(from, {
                method: 'POST',
                body: new TextEncoder().encode('tok_123'),
                redirects: {
                    follow: true,
                    max: 5,
                    crossOriginGuard: { headers: [], bodySecret: true, spellings: [] },
                },
            }),
            new AbortController().signal,
        );

        expect(response).toMatchObject({ status: 307, redirects: [], heldAt: from });
    });
    /** A client certificate and a proxy belong to a host: the next host gets its own, not these. */
    it('asks how each hop after the first reaches the network, by its own url', async () => {
        server = await startEchoServer();
        const to = `${server.origin}/echo`;
        const from = `${server.origin}/redirect?status=302&to=${encodeURIComponent(to)}`;
        const asked: string[] = [];
        const response = await sendRequest(
            request(from, {
                dial: (url) => {
                    asked.push(url);

                    return Promise.resolve({ tls: { verify: false } });
                },
            }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(asked).toEqual([to]);
    });
    it('cuts a redirect to file: with redirect-scheme', async () => {
        server = await startEchoServer();
        const to = 'file:///etc/passwd';
        const error = await sendRequest(
            request(`${server.origin}/redirect?status=302&to=${encodeURIComponent(to)}`),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('redirect-scheme');
    });
    it('follows a https to http redirect', async () => {
        server = await startEchoServer({ https: true });
        const plain = await startEchoServer();
        const to = plain.origin;
        const response = await sendRequest(
            request(`${server.origin}/redirect?status=302&to=${encodeURIComponent(to)}`),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(response.redirects).toHaveLength(1);
        await plain.close();
    });
});
