import { afterEach, describe, expect, it, vi } from 'vitest';

import { startSocketIoServer, type SocketIoServer } from '../support/socketio-server.js';
import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

/** The manager holds both transports behind the same port: nothing here names the client. */
describe('a connection that dials Socket.IO through the manager', () => {
    let server: SocketIoServer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        await server?.close();
        server = undefined;
    });

    it('opens, sends text, hears the echo and closes like any other connection', async () => {
        server = await startSocketIoServer();
        const watched = watchManager();

        await watched.manager.open({
            connectionId: 'gateway',
            transport: 'socketio',
            url: server.url,
        });

        expect(watched.states.map((push) => push.state)).toEqual(['connecting', 'open']);

        await watched.manager.send({
            connectionId: 'gateway',
            data: 'hola',
            event: 'chat:message',
            origin: 'Saludo',
        });

        await waitFor(() => {
            expect(
                watched.records.some(
                    (record) =>
                        record.direction === 'in' &&
                        record.data === 'hola' &&
                        record.event === 'chat:message',
                ),
            ).toBe(true);
        });
        expect(
            watched.records.some(
                (record) =>
                    record.direction === 'out' &&
                    record.event === 'chat:message' &&
                    record.origin === 'Saludo',
            ),
        ).toBe(true);

        await watched.manager.close({ connectionId: 'gateway' });

        expect(watched.states.at(-1)?.state).toBe('closed');
    });

    it('refuses an open the server never answered, instead of leaving it waiting', async () => {
        const watched = watchManager();

        await expect(
            watched.manager.open({
                connectionId: 'gateway',
                transport: 'socketio',
                url: 'http://127.0.0.1:1',
            }),
        ).rejects.toThrow();
        expect(watched.states.map((push) => push.state)).toEqual(['connecting', 'error', 'closed']);
    });

    /** A retry that finds the server still down is one more attempt, not the last one. */
    it('keeps trying while the server is down, and joins again once it is back', async () => {
        server = await startSocketIoServer();
        const port = Number(new URL(server.url).port);
        const watched = watchManager({
            reconnect: { baseMs: 20, ceilingMs: 40, maxAttempts: Number.POSITIVE_INFINITY },
        });

        await watched.manager.open({
            connectionId: 'gateway',
            transport: 'socketio',
            url: server.url,
        });
        await server.close();

        await waitFor(() => {
            expect(watched.states.filter((push) => push.state === 'reconnecting')).toHaveLength(2);
        });
        server = await startSocketIoServer(port);

        await waitFor(() => {
            expect(watched.states.filter((push) => push.state === 'open')).toHaveLength(2);
        });
        watched.manager.disposeAll();
    });

    /** Closed before the namespace joined, the open must still answer, or its caller waits. */
    it('settles an open the user closed before it joined, and tries no other', async () => {
        server = await startSocketIoServer();
        const watched = watchManager();
        const opened = watched.manager.open({
            connectionId: 'gateway',
            transport: 'socketio',
            url: server.url,
        });

        await watched.manager.close({ connectionId: 'gateway' });

        await expect(opened).rejects.toThrow();
        expect(watched.states.map((push) => push.state)).toEqual([
            'connecting',
            'closing',
            'closed',
        ]);
    });
});
