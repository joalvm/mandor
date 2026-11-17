import { afterEach, describe, expect, it, vi } from 'vitest';

import { dialSocketIo, type DialedSocket } from '../../src/client/socketio-dial.js';
import { startSocketIoServer } from '../support/socketio-server.js';
import { startSocketIoV2Server } from '../support/socketio-v2-server.js';

type Closable = { close: () => Promise<void> };

const opened: Closable[] = [];
const dialled: DialedSocket[] = [];

async function started<Server extends Closable>(server: Promise<Server>): Promise<Server> {
    const value = await server;

    opened.push(value);

    return value;
}

function dial(...args: Parameters<typeof dialSocketIo>): DialedSocket {
    const socket = dialSocketIo(...args);

    dialled.push(socket);

    return socket;
}

function heardOf(socket: DialedSocket): [string, ...unknown[]][] {
    const heard: [string, ...unknown[]][] = [];

    socket.onAny((event, ...args) => {
        heard.push([event, ...args]);
    });

    return heard;
}

afterEach(async () => {
    for (const socket of dialled.splice(0)) {
        socket.disconnect();
    }

    await Promise.all(opened.splice(0).map((server) => server.close()));
});

describe('dialSocketIo against a v4 server', () => {
    it('dials nothing until it is told to connect', async () => {
        const server = await started(startSocketIoServer());

        dial(server.url, {});

        await new Promise((resolve) => setImmediate(resolve));

        expect(server.clientCount()).toBe(0);
    });

    it('carries the auth in the handshake and hears every named event at one door', async () => {
        const server = await started(startSocketIoServer());
        const socket = dial(server.url, {
            auth: { token: 'abc' },
            engineTransport: 'websocket-only',
        });
        const heard = heardOf(socket);

        socket.on('connect', () => {
            socket.emit('chat', 'hola');
        });
        socket.connect();

        await vi.waitFor(() => {
            expect(heard).toEqual([['chat', 'hola']]);
        });
        expect(server.lastHandshake()?.auth).toEqual({ token: 'abc' });
    });
});

describe('dialSocketIo against a v2 server', () => {
    it('carries the auth in the query, where a v2 server reads it', async () => {
        const server = await started(startSocketIoV2Server());
        const socket = dial(server.url, {
            version: 'v2',
            auth: { token: 'abc' },
            engineTransport: 'websocket-only',
        });
        const connected = vi.fn();

        socket.on('connect', connected);
        socket.connect();

        await vi.waitFor(() => {
            expect(connected).toHaveBeenCalledOnce();
        });
        expect(server.lastQuery()).toMatchObject({ token: 'abc' });
    });

    it('hears a named event at the one door v2 never had', async () => {
        const server = await started(startSocketIoV2Server());
        const socket = dial(server.url, { version: 'v2', engineTransport: 'websocket-only' });
        const heard = heardOf(socket);

        socket.on('connect', () => {
            socket.emit('chat', 'hola');
        });
        socket.connect();

        await vi.waitFor(() => {
            expect(heard).toEqual([['chat', 'hola']]);
        });
    });

    it('stops hearing at that door once every listener is removed', async () => {
        const server = await started(startSocketIoV2Server());
        const socket = dial(server.url, { version: 'v2', engineTransport: 'websocket-only' });
        const heard = heardOf(socket);
        const named = vi.fn();

        socket.on('connect', () => {
            socket.removeAllListeners();
            socket.on('chat', named);
            socket.emit('chat', 'hola');
        });
        socket.connect();

        await vi.waitFor(() => {
            expect(named).toHaveBeenCalledWith('hola');
        });
        expect(heard).toEqual([]);
    });

    it('hands a failed attempt over as an error, whatever the engine said', async () => {
        const socket = dial('http://127.0.0.1:1', {
            version: 'v2',
            engineTransport: 'websocket-only',
        });
        const failed = vi.fn();

        socket.on('connect_error', failed);
        socket.connect();

        await vi.waitFor(() => {
            expect(failed).toHaveBeenCalled();
        });
        expect(failed.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
});
