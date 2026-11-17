import { afterEach, describe, expect, it } from 'vitest';

import type { AsyncClient } from '../../src/client/async-client.js';
import { WsClientError } from '../../src/client/ws-client-error.js';

import { SocketIoSendError } from '../../src/client/socketio-send-error.js';
import { startSocketIoServer, type SocketIoServer } from '../support/socketio-server.js';
import { waitFor } from '../support/wait-for.js';
import { watchSocketIoClient } from '../support/socketio-client-watch.js';

/** Every client of the package is handled through the port; this one proves the promise. */
function asPort(client: AsyncClient): AsyncClient {
    return client;
}

describe('SocketIoClient', () => {
    let server: SocketIoServer | undefined;

    afterEach(async () => {
        await server?.close();
        server = undefined;
    });

    const clientOf = () =>
        watchSocketIoClient(server?.url ?? 'http://127.0.0.1:1', { enginePath: '/socket.io' });

    it('opens against a Socket.IO server and reports the same life a websocket reports', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        const port: AsyncClient = asPort(client);

        port.open();

        await waitFor(() => {
            expect(seen.states).toEqual(['connecting', 'open']);
        });
        expect(server.clientCount()).toBe(1);

        port.close();
    });

    it('sends to a named event and hears the echo back with its name', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.send('hola', { event: 'chat:message' });

        await waitFor(() => {
            expect(seen.messages).toEqual([{ kind: 'text', data: 'hola', event: 'chat:message' }]);
        });

        client.close();
    });

    it('refuses an emission that names no event, without sending anything', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        expect(() => {
            client.send('hola');
        }).toThrow(SocketIoSendError);
        expect(seen.messages).toEqual([]);

        client.close();
    });

    it('refuses to open twice and to send before the namespace joined', async () => {
        server = await startSocketIoServer();
        const { client } = clientOf();

        client.open();

        expect(() => {
            client.open();
        }).toThrow(WsClientError);
        expect(() => {
            client.send('early');
        }).toThrow(WsClientError);

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.dispose();
    });

    /** Its own retries are off, so a failed handshake is the end of the attempt: it must say so. */
    it('ends a refused handshake the way a refused websocket ends', async () => {
        const { client, seen } = clientOf();

        client.open();

        await waitFor(() => {
            expect(seen.closed).toEqual([{ code: 1006, reason: '' }]);
        });
        expect(seen.states).toEqual(['connecting', 'error', 'closed']);
        expect(seen.errors).toHaveLength(1);

        client.dispose();
    });
});
