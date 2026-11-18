import { afterEach, describe, expect, it } from 'vitest';

import type { AsyncClientEvents } from '../../src/client/async-client.js';
import { startSocketIoServer, type SocketIoServer } from '../support/socketio-server.js';
import { waitFor } from '../support/wait-for.js';
import { watchSocketIoClient } from '../support/socketio-client-watch.js';

describe('the ack reply of a Socket.IO client', () => {
    let server: SocketIoServer | undefined;

    afterEach(async () => {
        await server?.close();
        server = undefined;
    });

    const clientOf = (events: Partial<AsyncClientEvents>) =>
        watchSocketIoClient(server?.url ?? 'http://127.0.0.1:1', {}, events).client;

    it('drops an ack reply that arrives with no payload at all', async () => {
        server = await startSocketIoServer();
        const seen: unknown[] = [];
        const client = clientOf({
            onMessage: (message) => {
                seen.push(message);
            },
        });

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        // A fixed sleep here would race the ack's own round trip and could dispose the socket
        // before a slow reply lands, dropping it for reasons that have nothing to do with the
        // code under test. A second, ordinary ack on the same connection arrives strictly
        // after the first — Socket.IO never reorders a single socket's packets — so waiting
        // for it proves the empty one was already handled by then.
        server.ackEmpty('quiet:ack');
        client.send('hola', { event: 'quiet:ack', ack: { id: 'ack-1', timeoutMs: 5_000 } });
        client.send('hola', { event: 'loud:ack', ack: { id: 'ack-2', timeoutMs: 5_000 } });

        await waitFor(() => {
            expect(seen).toHaveLength(1);
        });
        expect(seen[0]).toEqual({
            kind: 'text',
            data: 'hola',
            event: 'loud:ack',
            replyTo: 'ack-2',
        });

        client.dispose();
    });

    it('tags an ack reply that carries a payload with the id it answers', async () => {
        server = await startSocketIoServer();
        const seen: unknown[] = [];
        const client = clientOf({
            onMessage: (message) => {
                seen.push(message);
            },
        });

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.send('hola', { event: 'loud:ack', ack: { id: 'ack-1', timeoutMs: 5_000 } });

        await waitFor(() => {
            expect(seen).toHaveLength(1);
        });
        expect(seen[0]).toEqual({
            kind: 'text',
            data: 'hola',
            event: 'loud:ack',
            replyTo: 'ack-1',
        });

        client.dispose();
    });
});
