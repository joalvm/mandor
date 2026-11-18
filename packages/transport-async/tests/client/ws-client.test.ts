import { afterEach, describe, expect, it, vi } from 'vitest';

import { startEchoServer, type EchoServer } from '../support/echo-server.js';
import { watchWsClient, type WsClientWatch } from '../support/ws-client-watch.js';

async function waitForMessages(watched: WsClientWatch, count: number): Promise<void> {
    await vi.waitFor(() => {
        expect(watched.messages).toHaveLength(count);
    });
}

describe('WsClient', () => {
    let server: EchoServer | undefined;

    afterEach(async () => {
        vi.useRealTimers();
        await server?.close();
        server = undefined;
    });

    it('opens against the echo server and reports each state', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();
        await watched.opened;

        expect(watched.states).toEqual(['connecting', 'open']);
        watched.client.dispose();
    });

    it('sends text and receives the echo as a text message', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();
        await watched.opened;

        watched.client.send('hola');
        await waitForMessages(watched, 1);

        expect(watched.messages[0]).toEqual({ kind: 'text', data: 'hola' });
        watched.client.dispose();
    });

    it('keeps binary frames as bytes instead of stringifying them', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();
        await watched.opened;

        watched.client.send(new Uint8Array([0, 159, 146, 150]));
        await waitForMessages(watched, 1);

        const message = watched.messages[0];

        expect(message?.kind).toBe('binary');
        expect(message?.data).toEqual(new Uint8Array([0, 159, 146, 150]));
        watched.client.dispose();
    });

    it('reaches closed with its code when the remote end closes', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();
        await watched.opened;

        server.closeClients(4000);
        const { code } = await watched.closed;

        expect(code).toBe(4000);
        expect(watched.states.at(-1)).toBe('closed');
        watched.client.dispose();
    });

    it('sends the configured headers and negotiates the subprotocol', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url, {
            headers: { 'x-mandor-test': 'fase-2' },
            subprotocols: ['mandor.v1'],
        });

        watched.client.open();
        await watched.opened;

        expect(server.lastHeaders()['x-mandor-test']).toBe('fase-2');
        expect(server.lastProtocol()).toBe('mandor.v1');
        watched.client.dispose();
    });

    it('dials a plain connection it was told not to verify the certificate of', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url, { verifyCertificate: false });

        watched.client.open();
        await watched.opened;

        expect(watched.states).toEqual(['connecting', 'open']);
        watched.client.dispose();
    });

    it('closes instead of reserving memory when a frame passes the maximum size', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url, { maximumPayloadBytes: 16 });

        watched.client.open();
        await watched.opened;

        server.broadcastText('a frame that was never meant to fit in sixteen bytes');
        await watched.closed;

        expect(watched.states.at(-1)).toBe('closed');
        watched.client.dispose();
    });

    it('beats with the keepalive it was given and stays open while the line answers', async () => {
        vi.useFakeTimers();
        server = await startEchoServer();
        const echo = server;
        const watched = watchWsClient(server.url, {
            keepalive: { intervalMs: 100, pongTimeoutMs: 60_000 },
        });

        watched.client.open();
        await watched.opened;

        await vi.advanceTimersByTimeAsync(1_000);
        await vi.waitFor(
            () => {
                expect(echo.pingCount()).toBeGreaterThan(0);
            },
            { timeout: 5_000 },
        );

        expect(watched.states.at(-1)).toBe('open');
        watched.client.dispose();
    });

    it('stays silent when it was given no keepalive', async () => {
        vi.useFakeTimers();
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();
        await watched.opened;

        await vi.advanceTimersByTimeAsync(1_000);

        expect(server.pingCount()).toBe(0);
        watched.client.dispose();
    });
});
