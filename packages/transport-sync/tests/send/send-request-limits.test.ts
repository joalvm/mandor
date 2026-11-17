import { afterEach, describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import { sendRequest } from '../../src/send/send-request.js';
import type { SyncRequest } from '../../src/request/sync-request.js';
import { type EchoServer, startEchoServer } from '../support/http-server.js';
import { memorySpill } from '../support/memory-spill.js';

let server: EchoServer;

afterEach(async () => {
    await server.close();
});

function request(url: string, overrides: Partial<SyncRequest> = {}): SyncRequest {
    const base: SyncRequest = {
        method: 'POST',
        url,
        headers: [],
        body: new TextEncoder().encode('x'.repeat(2_000)),
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

describe('the limits a request sets on the wire', () => {
    /** A body past the limit is not downloaded to the end and not shown half. */
    it('dies with too-large when the body grows past the largest allowed', async () => {
        server = await startEchoServer();

        const sent = sendRequest(
            request(`${server.origin}/echo`, { maxResponseBytes: 100 }),
            new AbortController().signal,
        );

        await expect(sent).rejects.toBeInstanceOf(SyncSendError);
        await expect(sent).rejects.toMatchObject({ reason: 'too-large' });
    });

    it('brings a body that stays under the limit', async () => {
        server = await startEchoServer();

        const response = await sendRequest(
            request(`${server.origin}/echo`, { maxResponseBytes: 1 << 20 }),
            new AbortController().signal,
        );

        expect(response.status).toBe(200);
        expect(response.sizes.bodyBytes).toBe(2_000);
    });

    /** A disk slower than the wire holds the download back, and the body still arrives whole. */
    it('brings a big body whole over a spill that writes slower than the wire', async () => {
        server = await startEchoServer();
        const spill = memorySpill();
        const sent = new Uint8Array(4 << 20).fill(0x61);

        const response = await sendRequest(
            request(`${server.origin}/echo`, {
                body: sent,
                spill: {
                    thresholdBytes: 64 << 10,
                    open: () =>
                        Promise.resolve({
                            ...spill,
                            write: async (chunk) => {
                                await new Promise(setImmediate);
                                await spill.write(chunk);
                            },
                        }),
                },
            }),
            new AbortController().signal,
        );

        expect(response.body).toMatchObject({ kind: 'spilled', bytes: 4 << 20 });
        expect(spill.written().equals(Buffer.from(sent))).toBe(true);
    });

    it('settles the handshake within the bounds of the version the request names', async () => {
        server = await startEchoServer({ https: true });

        const response = await sendRequest(
            request(`${server.origin}/`, {
                method: 'GET',
                body: undefined,
                tls: { verify: false, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' },
            }),
            new AbortController().signal,
        );

        expect(response.network?.tls?.protocol).toBe('TLSv1.2');
    });
});
