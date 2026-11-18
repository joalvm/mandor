import net from 'node:net';
import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import { sendRequest } from '../../src/send/send-request.js';
import type { SyncRequest } from '../../src/request/sync-request.js';

/** A peer that takes the connection and never says a word: no TLS hello, no CONNECT answer. */
type SilentPeer = { port: number; reached: Promise<void>; close: () => Promise<void> };

let peer: SilentPeer | undefined;

afterEach(async () => {
    await peer?.close();
    peer = undefined;
});

async function startSilentPeer(): Promise<SilentPeer> {
    const sockets = new Set<net.Socket>();
    const server = net.createServer((socket) => {
        sockets.add(socket);
    });
    const reached = once(server, 'connection').then(() => undefined);

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    return {
        port: (server.address() as net.AddressInfo).port,
        reached,
        close: async () => {
            sockets.forEach((socket) => {
                socket.destroy();
            });
            server.close();
            await once(server, 'close');
        },
    };
}

/** The connect clock is longer than the test may run: only the abort can end these sends. */
function request(url: string, overrides: Partial<SyncRequest> = {}): SyncRequest {
    const base: SyncRequest = {
        method: 'GET',
        url,
        headers: [],
        spill: {
            open: () => Promise.reject(new Error('the spill must not open')),
            thresholdBytes: 1 << 20,
        },
        timeouts: { connectMs: 60_000, totalMs: 120_000 },
        tls: { verify: false },
        redirects: { follow: true, max: 5 },
    };

    return Object.assign(base, overrides);
}

function reasonOf(error: unknown): string {
    expect(error).toBeInstanceOf(SyncSendError);

    return (error as SyncSendError).reason;
}

describe('sendRequest before the socket is up', () => {
    it('stops at once when the person cancels during the handshake', async () => {
        peer = await startSilentPeer();
        const controller = new AbortController();
        const sending = sendRequest(
            request(`https://127.0.0.1:${String(peer.port)}/`),
            controller.signal,
        ).catch((caught: unknown) => caught);

        await peer.reached;
        controller.abort();

        expect(reasonOf(await sending)).toBe('aborted');
    });

    it('stops at the total timeout during the handshake', async () => {
        peer = await startSilentPeer();
        const error = await sendRequest(
            request(`https://127.0.0.1:${String(peer.port)}/`, {
                timeouts: { connectMs: 60_000, totalMs: 100 },
            }),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(reasonOf(error)).toBe('timeout-total');
    });

    it('stops at the total timeout while the proxy never answers the tunnel', async () => {
        peer = await startSilentPeer();
        const error = await sendRequest(
            request('https://example.test/', {
                proxy: { url: `http://127.0.0.1:${String(peer.port)}` },
                timeouts: { connectMs: 60_000, totalMs: 100 },
            }),
            new AbortController().signal,
        ).catch((caught: unknown) => caught);

        expect(reasonOf(error)).toBe('timeout-total');
    });
});
