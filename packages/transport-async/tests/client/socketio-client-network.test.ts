import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SocketIoClientOptions } from '../../src/client/socketio-client.js';
import {
    startEndlessServer,
    startSilentServer,
    startTunnelProxy,
    type Closable,
} from '../support/network-servers.js';
import { startSocketIoServer } from '../support/socketio-server.js';
import { openedSocketIoClient, watchSocketIoClient } from '../support/socketio-client-watch.js';

const opened: Closable[] = [];

async function started<Server extends Closable>(server: Promise<Server>): Promise<Server> {
    const value = await server;

    opened.push(value);

    return value;
}

afterEach(async () => {
    await Promise.all(opened.splice(0).map((server) => server.close()));
});

function clientOf(url: string, options: SocketIoClientOptions = {}) {
    return watchSocketIoClient(url, { engineTransport: 'websocket-only', ...options });
}

function openedClient(url: string, options: SocketIoClientOptions = {}) {
    return openedSocketIoClient(clientOf(url, options));
}

describe('the network a Socket.IO connection dials through', () => {
    /** The auth the editor writes as a header must reach the server, not stay behind. */
    it('carries the headers of the connection on its handshake', async () => {
        const server = await started(startSocketIoServer());
        const { client } = await openedClient(server.url, {
            headers: { Authorization: 'Bearer abc' },
        });

        expect(server.lastHandshake()?.headers['authorization']).toBe('Bearer abc');
        client.dispose();
    });

    it('carries the credentials of its address on the handshake', async () => {
        const server = await started(startSocketIoServer());
        const { client } = await openedClient(server.url.replace('http://', 'http://user:secret@'));

        expect(server.lastHandshake()?.headers['authorization']).toBe(
            `Basic ${Buffer.from('user:secret').toString('base64')}`,
        );
        client.dispose();
    });

    /**
     * Two connections to one server, each to its own namespace, are two people: the second must
     * not ride the transport of the first, which carries the headers and the trust of the first.
     */
    it('dials every connection on its own, even to another namespace of the same server', async () => {
        const server = await started(startSocketIoServer());
        const first = await openedClient(`${server.url}/alpha`, {
            headers: { Authorization: 'Bearer first' },
        });
        const second = await openedClient(`${server.url}/beta`, {
            headers: { Authorization: 'Bearer second' },
        });

        expect(server.lastHandshake()?.headers['authorization']).toBe('Bearer second');
        first.client.dispose();
        second.client.dispose();
    });

    it('gives the handshake up once its timeout passes with no answer', async () => {
        const silent = await started(startSilentServer());
        const { client, seen } = clientOf(`http://127.0.0.1:${String(silent.port)}`, {
            handshakeTimeoutMs: 50,
            engineTransport: 'polling-only',
        });

        client.open();

        await vi.waitFor(() => {
            expect(seen.errors.at(0)?.message).toMatch(/timeout/u);
        });
        expect(seen.states).toEqual(['connecting', 'error', 'closed']);
        client.dispose();
    });

    /** A server that answers a poll without end would otherwise fill main with one answer. */
    it.each(['v4', 'v2'] as const)(
        'gives a %s poll up once its answer passes the most a poll may carry',
        async (version) => {
            const endless = await started(startEndlessServer());
            const { client, seen } = clientOf(endless.url, {
                engineTransport: 'polling-only',
                version,
            });

            client.open();

            await vi.waitFor(
                () => {
                    expect(seen.states).toEqual(['connecting', 'error', 'closed']);
                },
                { timeout: 10_000 },
            );
            client.dispose();
        },
    );

    it('tunnels through the proxy it names', async () => {
        const server = await started(startSocketIoServer());
        const proxy = await started(startTunnelProxy());
        const { client } = await openedClient(server.url, { proxy: { url: proxy.url } });

        expect(proxy.targets).toEqual([new URL(server.url).host]);
        client.dispose();
    });
});
