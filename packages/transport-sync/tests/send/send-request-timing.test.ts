import { afterEach, describe, expect, it } from 'vitest';

import { sendRequest } from '../../src/send/send-request.js';
import type { SyncTimings } from '../../src/timing/sync-timings.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { type EchoServer, startEchoServer } from '../support/http-server.js';
import { type H2Server, startH2Server } from '../support/h2-server.js';

let server: EchoServer;
let h2: H2Server | undefined;

afterEach(async () => {
    await server.close();
    await h2?.close();
    h2 = undefined;
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

describe('sendRequest timings and protocol', () => {
    it('measures the phases and names the protocol over https', async () => {
        server = await startEchoServer({ https: true });
        const response = await sendRequest(
            request(`${server.origin}/`),
            new AbortController().signal,
        );

        const timings: SyncTimings = response.timings;

        expect(timings.dnsMs).toBeGreaterThanOrEqual(0);
        expect(response.timings.connectMs).toBeGreaterThanOrEqual(0);
        expect(response.timings.tlsMs).toBeGreaterThan(0);
        expect(response.timings.firstByteMs).toBeGreaterThan(0);
        expect(
            response.timings.dnsMs + response.timings.connectMs + response.timings.tlsMs,
        ).toBeLessThanOrEqual(response.timings.totalMs);
        expect(response.timings.viaProxy).toBe(false);
        expect(response.httpVersion).toBe('1.1');
    });
    it('reports HTTP/2 when the negotiation picks h2', async () => {
        h2 = await startH2Server();
        const response = await sendRequest(request(`${h2.origin}/`), new AbortController().signal);

        expect(response.status).toBe(200);
        expect(response.httpVersion).toBe('2');
    });
});
