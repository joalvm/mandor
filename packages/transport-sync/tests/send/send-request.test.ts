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
        // The spill never opens in these tests: every body stays inline and under the threshold.
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

describe('sendRequest', () => {
    it('sends a GET and returns status, status text, ordered headers and body', async () => {
        server = await startEchoServer();
        const response = await sendRequest(
            request(`${server.origin}/`),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.httpVersion).toBe('1.1');
        expect(response.body.kind).toBe('inline');
        expect(new TextDecoder().decode((response.body as { bytes: Uint8Array }).bytes)).toBe('ok');
        expect(response.headers.map(([name]) => name.toLowerCase())).toContain('x-order');
        expect(response.network?.remoteAddress).toBe('127.0.0.1');
        expect(response.network?.tls).toBeUndefined();
        expect(response.sizes.headerBytes).toBeGreaterThan(0);
    });

    it('keeps two Set-Cookie headers separate, in the order the server sent them', async () => {
        server = await startEchoServer();
        const response = await sendRequest(
            request(`${server.origin}/`),
            new AbortController().signal,
        );

        const cookies = response.headers.filter(([name]) => name.toLowerCase() === 'set-cookie');

        expect(cookies).toEqual([
            ['set-cookie', 'first=1; Path=/'],
            ['set-cookie', 'second=2; Path=/'],
        ]);
    });

    it('sends a POST with a body and the server echoes it back', async () => {
        server = await startEchoServer();
        const payload = new TextEncoder().encode('payload');
        const response = await sendRequest(
            request(`${server.origin}/echo`, {
                method: 'POST',
                headers: [['content-type', 'text/plain']],
                body: payload,
            }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(response.body.kind).toBe('inline');
        expect(Array.from((response.body as { bytes: Uint8Array }).bytes)).toEqual(
            Array.from(payload),
        );
    });

    it('rejects a non-http URL without touching the network', async () => {
        const error = await sendRequest(
            request('ftp://example.com/'),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('scheme');
    });

    it('reports a user abort as aborted', async () => {
        server = await startEchoServer({ delayMs: 2_000 });
        const controller = new AbortController();
        const sending = sendRequest(request(`${server.origin}/slow`), controller.signal);

        controller.abort();

        const error = await sending.catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('aborted');
    });

    it('reports a total timeout as timeout-total', async () => {
        server = await startEchoServer({ delayMs: 1_000 });
        const error = await sendRequest(
            request(`${server.origin}/slow`, { timeouts: { connectMs: 2_000, totalMs: 50 } }),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('timeout-total');
    });

    /**
     * Port 1 has nobody listening. A port of the test closed a moment ago does not do: another
     * server of the run may be given it before the request goes out, and answer.
     */
    it('maps a closed port to refused', async () => {
        const error = await sendRequest(
            request('http://127.0.0.1:1/'),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('refused');
    });

    it('maps an unresolvable host to dns', async () => {
        const error = await sendRequest(
            request('http://no-such-host.invalid/'),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('dns');
    });

    it('maps a socket that dies mid-response to unknown', async () => {
        server = await startEchoServer();
        const error = await sendRequest(
            request(`${server.origin}/reset`),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SyncSendError);
        expect((error as SyncSendError).reason).toBe('unknown');
    });

    it('decodes gzip on the way in and reports both sizes', async () => {
        server = await startEchoServer();
        const response = await sendRequest(
            request(`${server.origin}/gzipped`),
            new AbortController().signal,
        );

        expect(response.sizes.decoded).toBe(true);
        expect(response.sizes.bodyBytes).toBe('repetited body '.length * 80 - 1);
        expect(response.sizes.transferredBytes).toBeLessThan(response.sizes.bodyBytes);
        expect(
            new TextDecoder().decode(
                (response.body as { kind: 'inline'; bytes: Uint8Array }).bytes,
            ),
        ).toBe('repetited body '.repeat(80).trimEnd());
    });
});
