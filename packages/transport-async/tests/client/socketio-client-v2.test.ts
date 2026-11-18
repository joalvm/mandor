import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SocketIoClientOptions } from '../../src/client/socketio-client.js';
import { startSilentServer, type Closable } from '../support/network-servers.js';
import { startSocketIoV2Server } from '../support/socketio-v2-server.js';
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

describe('a Socket.IO v2 server', () => {
    it('opens, and hears a named event come back with its name', async () => {
        const server = await started(startSocketIoV2Server());
        const { client, seen } = await openedClient(server.url, { version: 'v2' });

        client.send('hola', { event: 'chat' });

        await vi.waitFor(() => {
            expect(seen.messages).toEqual([{ kind: 'text', data: 'hola', event: 'chat' }]);
        });
        client.dispose();
    });

    /** v2 had no handshake auth: the servers of the time read the query. */
    it('hands the auth entries over in the query', async () => {
        const server = await started(startSocketIoV2Server());
        const { client } = await openedClient(server.url, {
            version: 'v2',
            auth: { token: 'abc' },
        });

        expect(server.lastQuery()?.['token']).toBe('abc');
        client.dispose();
    });

    it('takes the answer of an emission that asked for one', async () => {
        const server = await started(startSocketIoV2Server());
        const { client, seen } = await openedClient(server.url, { version: 'v2' });

        client.send('ping', { event: 'ask', ack: { id: 'a1', timeoutMs: 5_000 } });

        await vi.waitFor(() => {
            expect(seen.messages).toEqual([
                { kind: 'text', data: 'ping', event: 'ask', replyTo: 'a1' },
            ]);
        });
        client.dispose();
    });

    it('reports a handshake that timed out as the failed attempt it is', async () => {
        const silent = await started(startSilentServer());
        const { client, seen } = clientOf(`http://127.0.0.1:${String(silent.port)}`, {
            version: 'v2',
            handshakeTimeoutMs: 50,
            engineTransport: 'polling-only',
        });

        client.open();

        await vi.waitFor(() => {
            expect(seen.errors.at(0)?.message).toMatch(/timeout/u);
        });
        client.dispose();
    });

    /** v2 never forbade a name that is not a string; no listener of the client can carry one. */
    it('hears no event whose name is not a string', async () => {
        const server = await started(startSocketIoV2Server());
        const { client, seen } = await openedClient(server.url, { version: 'v2' });

        client.send('hola', { event: 'numbered' });

        await vi.waitFor(() => {
            expect(seen.messages).toEqual([{ kind: 'text', data: 'hola', event: 'numbered' }]);
        });
        client.dispose();
    });

    it('reports a refused attempt with the error the engine gave', async () => {
        const { client, seen } = clientOf('http://127.0.0.1:1', { version: 'v2' });

        client.open();

        await vi.waitFor(() => {
            expect(seen.errors.at(0)?.message).toMatch(/websocket error/u);
        });
        client.dispose();
    });
});
