import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionManagerError } from '../../src/manager/connection-manager-error.js';
import { SocketOpenError } from '../../src/manager/socket-open-error.js';
import { startEchoServer, type EchoServer } from '../support/echo-server.js';
import { watchManager } from '../support/manager-watch.js';
import { waitFor } from '../support/wait-for.js';

const WS_OPEN = { transport: 'websocket', connectionId: 'gateway' } as const;

describe('why a connection could not open, as the manager tells it', () => {
    let server: EchoServer | undefined;
    let watched: ReturnType<typeof watchManager>;

    beforeEach(() => {
        watched = watchManager();
    });

    afterEach(async () => {
        watched.manager.disposeAll();
        await server?.close();
        server = undefined;
    });

    it('refuses the open with the reason its socket failed for, and the error beneath', async () => {
        const opened = watched.manager.open({ ...WS_OPEN, url: 'ws://127.0.0.1:1' });

        await expect(opened).rejects.toThrow(SocketOpenError);
        await expect(opened).rejects.toThrow(/ECONNREFUSED/u);
        await expect(opened).rejects.toMatchObject({ reason: 'refused' });
    });

    /** The drop of a live socket is no failure to open; each retry that found nobody is one. */
    it('names the failure of each retry, and none on the drop that started them', async () => {
        server = await startEchoServer();
        // This test checks failure reasons, not backoff. Retry only after shutdown has finished:
        // a dial racing the server's shutdown may be reset instead of refused by the network.
        watched = watchManager({
            reconnect: { baseMs: 60_000, ceilingMs: 60_000, maxAttempts: 2, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, url: server.url });
        await server.close();
        server = undefined;

        await waitFor(() => {
            expect(watched.states.at(-1)).toMatchObject({ attempt: 1, state: 'reconnecting' });
        });

        await watched.manager.retryNow({ connectionId: 'gateway' });
        await waitFor(() => {
            expect(watched.states.at(-1)).toMatchObject({ attempt: 2, state: 'reconnecting' });
        });
        await watched.manager.retryNow({ connectionId: 'gateway' });
        await waitFor(() => {
            expect(watched.states.filter((push) => push.attempt !== undefined)).toEqual([
                { attempt: 1, connectionId: 'gateway', state: 'reconnecting' },
                { attempt: 2, connectionId: 'gateway', reason: 'refused', state: 'reconnecting' },
                { attempt: 2, connectionId: 'gateway', reason: 'refused', state: 'error' },
            ]);
        });
    });

    /**
     * A connection that ended on its own holds nothing worth keeping, but it held the headers
     * and the keys it was opened with: kept, they outlived the origin they were resolved from.
     */
    it('lets go of a connection whose first attempt failed', async () => {
        await expect(watched.manager.open({ ...WS_OPEN, url: 'ws://127.0.0.1:1' })).rejects.toThrow(
            SocketOpenError,
        );

        await expect(watched.manager.send({ connectionId: 'gateway', data: 'x' })).rejects.toThrow(
            ConnectionManagerError,
        );
    });

    it('lets go of a connection once its retries ran out', async () => {
        server = await startEchoServer();
        watched = watchManager({
            reconnect: { baseMs: 5, ceilingMs: 10, maxAttempts: 1, spread: 0 },
        });

        await watched.manager.open({ ...WS_OPEN, url: server.url });
        await server.close();
        server = undefined;

        await waitFor(() => {
            expect(watched.states.at(-1)).toMatchObject({ attempt: 1, state: 'error' });
        });

        await expect(watched.manager.send({ connectionId: 'gateway', data: 'x' })).rejects.toThrow(
            ConnectionManagerError,
        );
    });
});
