import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import { sendRequest } from '../../src/send/send-request.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { type EchoServer, startEchoServer } from '../support/http-server.js';
import { startConnectProxy } from '../support/connect-proxy.js';

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

describe('sendRequest TLS and proxy over the wire', () => {
    it('verifies a self-signed server when the request carries its CA', async () => {
        const pair = new URL('.', import.meta.url);
        const ca = await readFile(new URL('../support/tls/cert.pem', pair), 'utf8');

        server = await startEchoServer({ https: true });
        const response = await sendRequest(
            request(`${server.origin}/`, { tls: { verify: true, ca } }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(response.network?.tls?.protocol).toMatch(/^TLSv1/);
        expect(response.network?.tls?.cipher).not.toBe('');
    });
    it('fails a self-signed server with tls when verify asks the system store', async () => {
        server = await startEchoServer({ https: true });
        const error = await sendRequest(
            request(`${server.origin}/`, { tls: { verify: true } }),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('tls');
    });
    it('keeps verify of one request from leaking into the next', async () => {
        server = await startEchoServer({ https: true });
        const relaxed = await sendRequest(
            request(`${server.origin}/`, { tls: { verify: false } }),
            new AbortController().signal,
        );

        expect(relaxed.status).toBe(200);

        const strict = await sendRequest(
            request(`${server.origin}/`, { tls: { verify: true } }),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect((strict as SyncSendError).reason).toBe('tls');
    });
    it('answers a server that demands a client certificate when the request carries one', async () => {
        const pair = new URL('.', import.meta.url);
        const cert = await readFile(new URL('../support/tls/cert.pem', pair), 'utf8');
        const key = await readFile(new URL('../support/tls/key.pem', pair), 'utf8');

        server = await startEchoServer({ https: true, requestCert: true });
        const response = await sendRequest(
            request(`${server.origin}/`, { tls: { verify: false, clientCert: { cert, key } } }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
    });
    it('sends through a CONNECT proxy and says so in the timings', async () => {
        server = await startEchoServer({ https: true });
        const proxy = await startConnectProxy();
        const response = await sendRequest(
            request(`${server.origin}/`, { proxy: { url: proxy.origin } }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(proxy.tunnels()).toBe(1);
        expect(response.timings.viaProxy).toBe(true);
        expect(
            response.timings.dnsMs + response.timings.connectMs + response.timings.tlsMs,
        ).toBeLessThanOrEqual(response.timings.totalMs);
        await proxy.close();
    });
});
