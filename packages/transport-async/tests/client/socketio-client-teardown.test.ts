import { afterEach, describe, expect, it } from 'vitest';

import { startSocketIoServer, type SocketIoServer } from '../support/socketio-server.js';
import { waitFor } from '../support/wait-for.js';
import { watchSocketIoClient } from '../support/socketio-client-watch.js';

describe('SocketIoClient teardown', () => {
    let server: SocketIoServer | undefined;

    afterEach(async () => {
        await server?.close();
        server = undefined;
    });

    const clientOf = () =>
        watchSocketIoClient(server?.url ?? 'http://127.0.0.1:1', { enginePath: '/socket.io' });

    it('reports the close the server chose with the code of an abnormal hangup', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        await server.close();

        await waitFor(() => {
            expect(seen.closed).toHaveLength(1);
        });

        expect(seen.closed[0]?.code).toBe(1006);
        expect(client.state).toBe('closed');
    });

    it('answers a manual close with the code of a normal end', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.close();

        await waitFor(() => {
            expect(seen.closed).toHaveLength(1);
        });

        expect(seen.closed[0]?.code).toBe(1000);
    });

    /** The protocol fires no ending for a socket that never joined; the client must. */
    it('ends an attempt closed while connecting the way an aborted websocket attempt ends', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        client.open();
        client.close();

        await waitFor(() => {
            expect(seen.closed).toEqual([{ code: 1006, reason: '' }]);
        });
        expect(seen.states).toEqual(['connecting', 'closing', 'closed']);
        expect(seen.errors).toEqual([]);
        expect(server.clientCount()).toBe(0);
    });

    it('forgets its socket on dispose, and nothing answers afterwards', async () => {
        server = await startSocketIoServer();
        const { client, seen } = clientOf();

        client.open();

        await waitFor(() => {
            expect(client.state).toBe('open');
        });

        client.dispose();

        expect(client.state).toBe('closed');
        expect(seen.closed).toHaveLength(0);
    });
});
