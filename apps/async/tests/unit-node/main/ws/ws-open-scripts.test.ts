import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    startEchoServer,
    type EchoServer,
} from '../../../../../../packages/transport-async/tests/support/echo-server.js';
import { waitFor } from '../../../../../../packages/transport-async/tests/support/wait-for.js';
import { startScriptSockets, type ScriptSockets } from './support/script-sockets.js';

let sockets: ScriptSockets;
let echo: EchoServer;

/** A ticket server on this machine; `/slow` answers only when the test lets it. */
async function ticketServer() {
    const held: ServerResponse[] = [];
    let asked = 0;
    const server = createServer((request, response) => {
        asked += 1;

        if (request.url === '/slow') {
            held.push(response);

            return;
        }

        response.end('tk-1');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return {
        url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        asked: () => asked,
        close: async () => {
            for (const response of held) {
                response.end('late');
            }

            server.closeAllConnections();
            await new Promise<void>((resolve) =>
                server.close(() => {
                    resolve();
                }),
            );
        },
    };
}

function before(source: string) {
    return { scripts: { onBeforeConnect: { source } } };
}

beforeEach(async () => {
    sockets = await startScriptSockets();
    echo = await startEchoServer();
});

afterEach(async () => {
    await sockets.stop();
    await echo.close();
});

function saidBefore() {
    return sockets.notes.filter((note) => note.event === 'onBeforeConnect');
}

describe('the script that runs before a connection opens', () => {
    it('fetches a ticket, sets a value, and the socket opens with it', async () => {
        const tickets = await ticketServer();

        try {
            const answer = await sockets.open({
                transport: 'websocket',
                template: { url: echo.url, headers: { 'X-Ticket': '{{ticket}}' } },
                ...before(
                    `const r = await mandor.sendRequest({ url: '${tickets.url}/ticket' }); mandor.variables.set('ticket', r.text());`,
                ),
            });

            expect(answer).toEqual({ ok: true, value: {} });
            expect(echo.lastHeaders()['x-ticket']).toBe('tk-1');
        } finally {
            await tickets.close();
        }
    });

    it('keeps the socket closed when the script fails, and names it', async () => {
        const answer = await sockets.open({
            transport: 'websocket',
            template: { url: echo.url },
            ...before('throw new Error("no ticket");'),
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'script-failed' } });
        expect(echo.clientCount()).toBe(0);
        expect(sockets.states()).toEqual(['connecting', 'closed']);
        expect(saidBefore()).toMatchObject([
            { error: { errorName: 'Error', message: 'no ticket' }, logs: [] },
        ]);
    });

    it('tells the window what the script said once, as the socket opens', async () => {
        await sockets.open({
            transport: 'websocket',
            template: { url: echo.url },
            ...before(
                'console.log("hi"); mandor.variables.set("a", "1"); mandor.test("ok", () => {});',
            ),
        });

        expect(saidBefore()).toEqual([
            expect.objectContaining({
                connectionId: 'echo',
                logs: [
                    { level: 'log', text: 'hi' },
                    { level: 'warn', notice: 'no-reconnect' },
                ],
                tests: [{ name: 'ok', passed: true }],
                variables: [{ name: 'a', preview: '1' }],
                withheld: [],
            }),
        ]);
        expect(saidBefore()[0]).not.toHaveProperty('secretsOff');
    });

    it('says nothing for an open that skips its scripts', async () => {
        await sockets.open({
            transport: 'websocket',
            template: { url: echo.url },
            skipScripts: true,
            ...before('console.log("never");'),
        });

        expect(saidBefore()).toEqual([]);
    });

    it('opens as before when the open skips its scripts', async () => {
        const answer = await sockets.open({
            transport: 'websocket',
            template: { url: echo.url },
            skipScripts: true,
            ...before('throw new Error("never runs");'),
        });

        expect(answer).toEqual({ ok: true, value: {} });
        expect(echo.clientCount()).toBe(1);
    });

    /** A retry would reuse the ticket the script fetched once: the drop ends it for good. */
    it('does not reconnect on its own once a script ran', async () => {
        await sockets.open({
            transport: 'websocket',
            template: { url: echo.url },
            ...before('mandor.variables.set("ran", "1");'),
        });
        echo.closeClients(1011);

        await waitFor(() => {
            expect(sockets.states().at(-1)).toBe('error');
        });
        expect(sockets.states()).not.toContain('reconnecting');
        expect(echo.clientCount()).toBe(0);
    });
});

describe('a close or another open while the script runs', () => {
    it('stops the script, opens nothing and paints no failure', async () => {
        const tickets = await ticketServer();

        try {
            const opening = sockets.open({
                transport: 'websocket',
                template: { url: echo.url },
                ...before(`await mandor.sendRequest({ url: '${tickets.url}/slow' });`),
            });

            await waitFor(() => {
                expect(tickets.asked()).toBe(1);
            });
            await sockets.close();

            await expect(opening).resolves.toMatchObject({
                ok: false,
                error: { code: 'ws-open-cancelled' },
            });
            expect(echo.clientCount()).toBe(0);
            expect(sockets.states()).toContain('closed');
            expect(saidBefore()).toEqual([]);
        } finally {
            await tickets.close();
        }
    });

    it('lets the new open take the place of the one whose script still runs', async () => {
        const tickets = await ticketServer();

        try {
            const first = sockets.open({
                transport: 'websocket',
                template: { url: echo.url },
                ...before(`await mandor.sendRequest({ url: '${tickets.url}/slow' });`),
            });

            await waitFor(() => {
                expect(tickets.asked()).toBe(1);
            });

            const second = await sockets.open({
                transport: 'websocket',
                template: { url: echo.url },
                skipScripts: true,
            });

            expect(second).toEqual({ ok: true, value: {} });
            await expect(first).resolves.toMatchObject({ error: { code: 'ws-open-cancelled' } });
            expect(echo.clientCount()).toBe(1);
            expect(sockets.states().at(-1)).toBe('open');
        } finally {
            await tickets.close();
        }
    });
});
