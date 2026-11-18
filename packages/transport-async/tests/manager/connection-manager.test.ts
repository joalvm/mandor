import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionManagerError } from '../../src/manager/connection-manager-error.js';
import { WsClientError } from '../../src/client/ws-client-error.js';
import { SocketUrlError } from '../../src/url/socket-url-error.js';
import { startEchoServer, type EchoServer } from '../support/echo-server.js';
import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

const WS_OPEN = { transport: 'websocket' } as const;

const NO_RECONNECT = { baseMs: 5, ceilingMs: 10, maxAttempts: 0, spread: 0 };
/** Quick enough that a replaced socket coming back would show inside the wait. */
const FAST_RECONNECT = { baseMs: 5, ceilingMs: 10, maxAttempts: 5, spread: 0 };

describe('ConnectionManager', () => {
    let server: EchoServer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        await server?.close();
        server = undefined;
    });

    it('opens a connection and reports each state', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        expect(watched.states.map((push) => push.state)).toEqual(['connecting', 'open']);
        watched.manager.disposeAll();
    });

    /** A window that reloads forgets its sockets and dials again: refusing kept the id taken. */
    it('replaces the socket of a connection it already holds when it is opened again', async () => {
        server = await startEchoServer();
        const harness = watchManager({ reconnect: FAST_RECONNECT });

        await harness.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });
        await harness.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });
        await harness.manager.send({ connectionId: 'gateway', data: 'hola' });

        await waitFor(() => {
            expect(server?.clientCount()).toBe(1);
            expect(harness.records.filter((record) => record.direction === 'in')).toHaveLength(1);
        });
        expect(harness.states.at(-1)?.state).toBe('open');
        harness.manager.disposeAll();
    });

    it('settles an open still in flight with the open that replaced it', async () => {
        server = await startEchoServer();
        const harness = watchManager({ reconnect: FAST_RECONNECT });
        const first = harness.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: server.url,
        });
        const second = harness.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: server.url,
        });

        await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
        await waitFor(() => {
            expect(server?.clientCount()).toBe(1);
        });
        harness.manager.disposeAll();
    });

    it('rejects an open still in flight when the open that replaced it has a bad URL', async () => {
        server = await startEchoServer();
        const harness = watchManager({ reconnect: NO_RECONNECT });
        const first = harness.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: server.url,
        });
        const second = harness.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: 'http://example.com',
        });
        const outcomes = await Promise.allSettled([first, second]);

        expect(outcomes.map((outcome) => outcome.status)).toEqual(['rejected', 'rejected']);
        await expect(first).rejects.toThrow(SocketUrlError);
        harness.manager.disposeAll();
    });

    it('rejects a URL that is not ws: and leaves the id free', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await expect(
            watched.manager.open({
                ...WS_OPEN,
                connectionId: 'gateway',
                url: 'http://example.com',
            }),
        ).rejects.toThrow(SocketUrlError);
        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        expect(watched.states.at(-1)?.state).toBe('open');
        watched.manager.disposeAll();
    });

    it('forwards the headers and subprotocols of the open request', async () => {
        server = await startEchoServer();
        const watched = watchManager();

        await watched.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: server.url,
            headers: { 'x-mandor-test': 'fase-3' },
            subprotocols: ['mandor.v1'],
        });

        expect(server.lastHeaders()['x-mandor-test']).toBe('fase-3');
        expect(server.lastProtocol()).toBe('mandor.v1');
        watched.manager.disposeAll();
    });

    it('rejects a send to an unknown connection', async () => {
        const watched = watchManager();

        await expect(watched.manager.send({ connectionId: 'ghost', data: 'hola' })).rejects.toThrow(
            ConnectionManagerError,
        );
    });

    it('closes an unknown connection without complaining', async () => {
        const watched = watchManager();

        await expect(watched.manager.close({ connectionId: 'ghost' })).resolves.toBeUndefined();
        expect(watched.states).toEqual([]);
        watched.manager.disposeAll();
    });

    it('rejects a send while the connection waits to dial again', async () => {
        server = await startEchoServer();
        const watched = watchManager({
            reconnect: { baseMs: 60_000, ceilingMs: 60_000, maxAttempts: 1, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });
        server.closeClients(4000);
        await waitFor(() => {
            expect(watched.states.at(-1)?.state).toBe('reconnecting');
        });

        await expect(
            watched.manager.send({ connectionId: 'gateway', data: 'hola' }),
        ).rejects.toThrow(WsClientError);
        watched.manager.disposeAll();
    });

    it('disposeAll leaves no timers and no sockets alive', async () => {
        vi.useFakeTimers();
        server = await startEchoServer();
        const watched = watchManager({
            batchWindowMs: 60_000,
            reconnect: { baseMs: 60_000, ceilingMs: 60_000, maxAttempts: 10, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });
        await watched.manager.send({ connectionId: 'gateway', data: 'pending' });

        server.closeClients(4000);
        await waitFor(() => {
            // Attempts remain: the manager arms the retry timer in the same tick, no dangling 'closed'.
            expect(watched.states.at(-1)?.state).toBe('reconnecting');
        });
        expect(vi.getTimerCount()).toBeGreaterThan(0);

        watched.manager.disposeAll();

        expect(vi.getTimerCount()).toBe(0);
        await waitFor(() => {
            expect(server?.clientCount()).toBe(0);
        });
    });
});
