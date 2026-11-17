import { afterEach, describe, expect, it } from 'vitest';

import type { AsyncClientEvents } from '../../src/client/async-client.js';
import type { SocketIoClientOptions } from '../../src/client/socketio-client.js';
import { startSocketIoServer, type SocketIoServer } from '../support/socketio-server.js';
import { waitFor } from '../support/wait-for.js';
import { watchSocketIoClient } from '../support/socketio-client-watch.js';

describe('the payload and the dial options of a Socket.IO client', () => {
    let server: SocketIoServer | undefined;

    afterEach(async () => {
        await server?.close();
        server = undefined;
    });

    const clientOf = (events: Partial<AsyncClientEvents>, options: SocketIoClientOptions = {}) =>
        watchSocketIoClient(server?.url ?? 'http://127.0.0.1:1', options, events).client;

    it('carries the auth entries, the engine path and the engine transport it is given', async () => {
        server = await startSocketIoServer();
        const seen: string[] = [];
        const client = clientOf(
            {
                onState: (state) => {
                    seen.push(state);
                },
            },
            {
                auth: { token: 'secret' },
                enginePath: '/socket.io',
                engineTransport: 'polling-only',
                verifyCertificate: false,
            },
        );

        client.open();

        await waitFor(() => {
            expect(seen).toEqual(['connecting', 'open']);
        });

        client.dispose();
    });

    /** The same ceiling as a bare websocket: a frame past it closes the line, not the memory. */
    it('closes instead of taking an event past the maximum size, over a websocket', async () => {
        server = await startSocketIoServer();
        const watched = watchSocketIoClient(server.url, {
            engineTransport: 'websocket-only',
            maximumPayloadBytes: 512,
        });

        watched.client.open();
        await waitFor(() => {
            expect(watched.client.state).toBe('open');
        });

        server.broadcast('big', 'x'.repeat(4096));

        await waitFor(() => {
            expect(watched.seen.states.at(-1)).toBe('closed');
        });
        expect(watched.seen.messages).toEqual([]);
        watched.client.dispose();
    });

    it('joins the root namespace when the connection carries none', async () => {
        server = await startSocketIoServer();
        const client = clientOf({}, { namespace: '/' });

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.dispose();
    });

    it('joins the namespace the connection names, riding the url it dials', async () => {
        server = await startSocketIoServer();
        const client = clientOf({}, { namespace: '/chat' });

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.dispose();
    });

    it('answers a close asked in idle with silence, and stays as it was', async () => {
        server = await startSocketIoServer();
        const client = clientOf({});

        client.close();

        expect(client.state).toBe('idle');
    });

    it('serializes a payload the protocol already parsed, or carries as bytes', async () => {
        server = await startSocketIoServer();
        const seen: { kind: string; data: unknown }[] = [];
        const client = clientOf({
            onMessage: (message) => {
                seen.push({ kind: message.kind, data: message.data });
            },
        });

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        server.broadcast('json', { hello: 'world' });
        server.broadcast('bytes', new Uint8Array([1, 2, 3]));

        await waitFor(() => {
            expect(seen).toHaveLength(2);
        });
        expect(seen[0]).toEqual({ kind: 'text', data: '{"hello":"world"}' });
        expect(seen[1]?.kind).toBe('binary');

        client.dispose();
    });

    it('ignores an inbound event that carries no payload at all', async () => {
        server = await startSocketIoServer();
        const seen: unknown[] = [];
        const client = clientOf({
            onMessage: (message) => {
                seen.push(message.data);
            },
        });

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        // One connection delivers in order: once the event sent after it lands, the empty one
        // has been read, and whatever it was going to do is done.
        server.broadcast('ping-none');
        server.broadcast('json', { after: true });

        await waitFor(() => {
            expect(seen).toHaveLength(1);
        });
        expect(seen).toEqual(['{"after":true}']);
        client.dispose();
    });
});
