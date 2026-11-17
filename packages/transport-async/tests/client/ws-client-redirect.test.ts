import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { waitFor } from '../support/wait-for.js';
import { watchWsClient } from '../support/ws-client-watch.js';

/** A loopback server and every request or upgrade that reached it, so a hop is seen. */
type Counted = { server: Server; url: string; reached: () => number };

const running: Server[] = [];

async function listen(server: Server): Promise<string> {
    running.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return `127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

/** The second server: it answers nothing, and only counts who knocked. */
async function elsewhere(): Promise<Counted> {
    let reached = 0;
    const server = createServer(() => {
        reached += 1;
    });

    server.on('upgrade', (_request, socket) => {
        reached += 1;
        socket.destroy();
    });

    const host = await listen(server);

    return { server, url: `ws://${host}/socket`, reached: () => reached };
}

/** The first server: it answers the upgrade with a 302 toward the second. */
async function redirecting(to: string): Promise<string> {
    const server = createServer();

    server.on('upgrade', (_request, socket) => {
        socket.end(`HTTP/1.1 302 Found\r\nLocation: ${to}\r\nContent-Length: 0\r\n\r\n`);
    });

    return `ws://${await listen(server)}/socket`;
}

afterEach(async () => {
    for (const server of running.splice(0)) {
        server.closeAllConnections();
        await new Promise<void>((resolve) =>
            server.close(() => {
                resolve();
            }),
        );
    }
});

/**
 * A socket a script pointed somewhere keeps the secrets the person wrote, and a redirect is the
 * one way a websocket could still carry them elsewhere: the client never follows one.
 */
describe('a websocket whose upgrade is answered with a redirect', () => {
    it('fails, and the server it was sent to never hears from it', async () => {
        const second = await elsewhere();
        const watched = watchWsClient(await redirecting(second.url), {
            headers: { Authorization: 'Bearer tok_secret' },
        });

        watched.client.open();
        await waitFor(() => {
            expect(watched.errors.length).toBeGreaterThan(0);
        });

        expect(watched.states).not.toContain('open');
        expect(second.reached()).toBe(0);
        watched.client.dispose();
    });
});
