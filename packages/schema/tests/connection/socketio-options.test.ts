import { describe, expect, it } from 'vitest';

import { parseConnection } from '../../src/index.js';
import {
    DEFAULT_SOCKETIO_OPTIONS,
    socketIoOptionsSchema,
} from '../../src/connection/socketio-options.js';
import { DEFAULT_WEBSOCKET_OPTIONS } from '../../src/connection/websocket-options.js';

describe('DEFAULT_SOCKETIO_OPTIONS', () => {
    it('joins the root namespace over websocket only and waits ten seconds for an ack', () => {
        expect(DEFAULT_SOCKETIO_OPTIONS).toEqual({
            ackTimeoutMs: 10_000,
            auth: {},
            disabledAuth: {},
            enginePath: '/socket.io',
            engineTransport: 'websocket-only',
            maximumMessageSizeKiB: 102_400,
            namespace: '/',
            version: 'v4',
        });
    });

    /** One ceiling for every socket: a Socket.IO frame is a websocket frame underneath. */
    it('takes the largest message a bare websocket takes', () => {
        expect(DEFAULT_SOCKETIO_OPTIONS.maximumMessageSizeKiB).toBe(
            DEFAULT_WEBSOCKET_OPTIONS.maximumMessageSizeKiB,
        );
    });
});

describe('the protocol version of a Socket.IO connection', () => {
    /** v3 changed the wire from v2; a v2 server still answers only a v2 client. */
    it('speaks v4 or v2, nothing in between', () => {
        expect(socketIoOptionsSchema.parse({ version: 'v2' }).version).toBe('v2');
        expect(socketIoOptionsSchema.safeParse({ version: 'v3' }).success).toBe(false);
    });
});

describe('socketIoOptionsSchema', () => {
    it('parses a full set of options', () => {
        expect(
            socketIoOptionsSchema.parse({
                ackTimeoutMs: 5_000,
                auth: { token: '{{token}}' },
                disabledAuth: { token: 'kept' },
                enginePath: '/engine.io/',
                engineTransport: 'polling-then-upgrade',
                maximumMessageSizeKiB: 64,
                namespace: '/admin',
            }),
        ).toEqual({
            ackTimeoutMs: 5_000,
            auth: { token: '{{token}}' },
            disabledAuth: { token: 'kept' },
            enginePath: '/engine.io/',
            engineTransport: 'polling-then-upgrade',
            maximumMessageSizeKiB: 64,
            namespace: '/admin',
        });
    });

    it('refuses a maximum message size past the ceiling of a websocket', () => {
        expect(socketIoOptionsSchema.safeParse({ maximumMessageSizeKiB: 262_145 }).success).toBe(
            false,
        );
        expect(socketIoOptionsSchema.safeParse({ maximumMessageSizeKiB: 0 }).success).toBe(false);
    });

    it('refuses an ack wait that is not a positive wait', () => {
        expect(socketIoOptionsSchema.safeParse({ ackTimeoutMs: 0 }).success).toBe(false);
    });

    it('refuses a namespace without the leading slash every namespace carries', () => {
        expect(socketIoOptionsSchema.safeParse({ namespace: 'admin' }).success).toBe(false);
    });

    it('refuses an engine path that is not a path at all', () => {
        expect(socketIoOptionsSchema.safeParse({ enginePath: 'socket.io' }).success).toBe(false);
    });

    it('refuses an engine transport the client cannot dial', () => {
        expect(socketIoOptionsSchema.safeParse({ engineTransport: 'webtransport' }).success).toBe(
            false,
        );
    });
});

describe('a connection that carries socket.io options', () => {
    it('parses with the options it names', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'gateway',
                name: 'Gateway',
                socketio: { namespace: '/admin' },
                transport: 'socketio',
                url: 'https://example.com',
            }).socketio,
        ).toEqual({ namespace: '/admin' });
    });

    it('parses without any option present', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'gateway',
                name: 'Gateway',
                transport: 'socketio',
                url: 'https://example.com',
            }).socketio,
        ).toBeUndefined();
    });
});
