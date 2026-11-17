import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';

import { startEchoServer, type EchoServer } from '../support/echo-server.js';

import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

const WS_OPEN = { transport: 'websocket' } as const;

const NO_RECONNECT = { baseMs: 5, ceilingMs: 10, maxAttempts: 0, spread: 0 };
const FAST_RECONNECT = { ...NO_RECONNECT, maxAttempts: Number.POSITIVE_INFINITY };

describe('ConnectionManager reconnect', () => {
    let server: EchoServer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        await server?.close();
        server = undefined;
    });

    it('reconnects with backoff after a remote close', async () => {
        server = await startEchoServer();
        const watched = watchManager({ reconnect: FAST_RECONNECT });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        server.closeClients(4000);
        await waitFor(() => {
            expect(watched.states.filter((push) => push.state === 'open')).toHaveLength(2);
        });

        expect(watched.states.map((push) => push.state)).toEqual([
            'connecting',
            'open',
            'closed',
            'reconnecting',
            'connecting',
            'open',
        ]);
        watched.manager.disposeAll();
    });

    it('stays closed when the user closed the connection', async () => {
        vi.useFakeTimers();
        server = await startEchoServer();
        const watched = watchManager({ reconnect: FAST_RECONNECT });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        await watched.manager.close({ connectionId: 'gateway' });
        await waitFor(() => {
            expect(watched.states.at(-1)?.state).toBe('closed');
        });
        await vi.advanceTimersByTimeAsync(60_000);

        expect(watched.states.filter((push) => push.state === 'connecting')).toHaveLength(1);
        watched.manager.disposeAll();
    });

    it('cancels a pending reconnect when the user closes', async () => {
        vi.useFakeTimers();
        server = await startEchoServer();
        const watched = watchManager({
            reconnect: { baseMs: 5_000, ceilingMs: 5_000, maxAttempts: 10, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        server.closeClients(4000);
        await waitFor(() => {
            // Attempts remain (maxAttempts: 10): the manager arms a retry instead of settling closed.
            expect(watched.states.at(-1)?.state).toBe('reconnecting');
        });

        await watched.manager.close({ connectionId: 'gateway' });
        await vi.advanceTimersByTimeAsync(60_000);

        expect(watched.states.filter((push) => push.state === 'connecting')).toHaveLength(1);
        watched.manager.disposeAll();
    });

    it('stays closed when the server never answers and retries are off', async () => {
        const watched = watchManager({ reconnect: NO_RECONNECT });

        await expect(
            watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: 'ws://127.0.0.1:1' }),
        ).rejects.toThrow();
        await waitFor(() => {
            expect(watched.states.map((push) => push.state)).toEqual([
                'connecting',
                'error',
                'closed',
            ]);
        });

        watched.manager.disposeAll();
    });

    it('never rearms a first attempt that never opened, whatever the policy says', async () => {
        vi.useFakeTimers();
        const watched = watchManager({ reconnect: FAST_RECONNECT });

        await expect(
            watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: 'ws://127.0.0.1:1' }),
        ).rejects.toThrow();
        await waitFor(() => {
            expect(watched.states.at(-1)?.state).toBe('closed');
        });
        await vi.advanceTimersByTimeAsync(60_000);

        expect(watched.states.filter((push) => push.state === 'connecting')).toHaveLength(1);
        watched.manager.disposeAll();
    });

    it('obeys the policy of the open request over the policy of the manager', async () => {
        vi.useFakeTimers();
        server = await startEchoServer();
        const watched = watchManager({ reconnect: FAST_RECONNECT });

        await watched.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: server.url,
            keepalive: { intervalMs: 50, pongTimeoutMs: 50 },
            maximumMessageSizeBytes: 64,
            reconnect: NO_RECONNECT,
            verifyCertificate: false,
        });

        server.closeClients(4000);
        await waitFor(() => {
            // The request's policy has maxAttempts: 0 — exhausted on the first close.
            expect(watched.states.at(-1)?.state).toBe('error');
        });
        await vi.advanceTimersByTimeAsync(60_000);

        // The manager's own policy would have rearmed within the hour; the request's says no.
        expect(watched.states.filter((push) => push.state === 'open')).toHaveLength(1);
        watched.manager.disposeAll();
    });

    it('gives up on a server that accepts and hangs up at once, instead of retrying forever', async () => {
        const flapping = new WebSocketServer({ host: '127.0.0.1', port: 0 });

        flapping.on('connection', (socket) => {
            socket.close(1008);
        });
        await once(flapping, 'listening');
        const watched = watchManager({
            reconnect: { baseMs: 5, ceilingMs: 10, maxAttempts: 3, spread: 0 },
        });
        const { port } = flapping.address() as AddressInfo;

        await watched.manager.open({
            ...WS_OPEN,
            connectionId: 'gateway',
            url: `ws://127.0.0.1:${String(port)}`,
        });
        await waitFor(() => {
            expect(watched.states.at(-1)?.state).toBe('error');
        });

        expect(watched.states.filter((push) => push.state === 'open')).toHaveLength(4);
        watched.manager.disposeAll();
        flapping.close();
    });

    it('gives up after two exhausted attempts', async () => {
        server = await startEchoServer();
        const watched = watchManager({
            reconnect: { baseMs: 5, ceilingMs: 10, maxAttempts: 2, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });
        await server.close();
        server = undefined;

        await waitFor(() => {
            expect(watched.states.at(-1)?.state).toBe('error');
        });

        watched.manager.disposeAll();
    });

    it('retryNow cancels the wait and opens again right away', async () => {
        server = await startEchoServer();
        const watched = watchManager({
            reconnect: { baseMs: 5_000, ceilingMs: 5_000, maxAttempts: 10, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        server.closeClients(4000);
        await waitFor(() => {
            expect(watched.states.at(-1)?.state).toBe('reconnecting');
        });

        await watched.manager.retryNow({ connectionId: 'gateway' });
        await waitFor(() => {
            expect(watched.states.filter((push) => push.state === 'open')).toHaveLength(2);
        });

        watched.manager.disposeAll();
    });

    it('retryNow does nothing when no reconnect is pending', async () => {
        server = await startEchoServer();
        const watched = watchManager({ reconnect: FAST_RECONNECT });

        await watched.manager.open({ ...WS_OPEN, connectionId: 'gateway', url: server.url });

        await expect(
            watched.manager.retryNow({ connectionId: 'gateway' }),
        ).resolves.toBeUndefined();
        expect(watched.states.map((push) => push.state)).toEqual(['connecting', 'open']);

        watched.manager.disposeAll();
    });
});
