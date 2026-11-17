import { afterEach, describe, expect, it } from 'vitest';

import { WsClientError } from '../../src/client/ws-client-error.js';
import { SocketUrlError } from '../../src/url/socket-url-error.js';
import { startEchoServer, type EchoServer } from '../support/echo-server.js';
import { watchWsClient } from '../support/ws-client-watch.js';

describe('WsClient teardown', () => {
    let server: EchoServer | undefined;

    afterEach(async () => {
        await server?.close();
        server = undefined;
    });

    it('reaches closed with code 1000 after a local close', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();
        await watched.opened;

        watched.client.close();
        const { code } = await watched.closed;

        expect(code).toBe(1000);
        expect(watched.states.at(-1)).toBe('closed');
        watched.client.dispose();
    });

    it('refuses to send while not open', () => {
        const watched = watchWsClient('ws://127.0.0.1:1');

        expect(() => {
            watched.client.send('hola');
        }).toThrow(WsClientError);
    });

    it('refuses to open twice', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();

        expect(() => {
            watched.client.open();
        }).toThrow(WsClientError);
        await watched.opened;
        watched.client.dispose();
    });

    it('rejects a URL that is not ws: or wss:', () => {
        const watched = watchWsClient('http://example.com');

        expect(() => {
            watched.client.open();
        }).toThrow(SocketUrlError);
    });

    it('reports an error and closes when the server refuses the connection', async () => {
        const watched = watchWsClient('ws://127.0.0.1:1');

        watched.client.open();
        await watched.closed;

        expect(watched.errors.length).toBeGreaterThan(0);
        expect(watched.states.at(-1)).toBe('closed');
        watched.client.dispose();
    });

    it('close while idle is a no-op', () => {
        const watched = watchWsClient('ws://127.0.0.1:1');

        watched.client.close();

        expect(watched.states).toEqual([]);
        expect(watched.client.state).toBe('idle');
    });

    it('close while connecting aborts the attempt', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();

        watched.client.close();
        const { code } = await watched.closed;

        expect(code).toBe(1006);
        expect(watched.states).toContain('closing');
        expect(watched.states.at(-1)).toBe('closed');
        watched.client.dispose();
    });

    it('dispose before open fires nothing and ends closed', () => {
        const watched = watchWsClient('ws://127.0.0.1:1');

        watched.client.dispose();

        expect(watched.states).toEqual([]);
        expect(watched.client.state).toBe('closed');
    });

    it('dispose while connecting kills the attempt without events', async () => {
        server = await startEchoServer();
        const watched = watchWsClient(server.url);

        watched.client.open();

        watched.client.dispose();

        expect(watched.states).toEqual(['connecting']);
        expect(watched.client.state).toBe('closed');
    });
});
