import { describe, expect, it } from 'vitest';

import { parseConnection, type Connection } from '@mandor/schema';

import {
    FACTORY_CONNECTION_DEFAULTS,
    namespaceOf,
    resolvedKeepalive,
    resolvedRetry,
    resolvedSocketio,
    resolvedWebsocket,
} from '../../../../../src/renderer/features/connections/lib/connection-settings.js';

function connectionOf(changes: Record<string, unknown>): Connection {
    return parseConnection({
        environmentId: null,
        headers: [],
        id: 'orders',
        name: 'Orders',
        transport: 'websocket',
        url: 'ws://localhost:3000',
        ...changes,
    });
}

describe('resolvedWebsocket', () => {
    it('answers the defaults of the domain when the file saved nothing', () => {
        expect(resolvedWebsocket(connectionOf({}))).toEqual({
            maximumMessageSizeKiB: 102_400,
            subprotocols: [],
            verifyCertificate: true,
        });
    });

    it('answers what the file saved over the default, field by field', () => {
        expect(
            resolvedWebsocket(connectionOf({ websocket: { verifyCertificate: false } })),
        ).toEqual({
            maximumMessageSizeKiB: 102_400,
            subprotocols: [],
            verifyCertificate: false,
        });
    });
});

describe('namespaceOf', () => {
    it('answers the namespace a socket.io connection joins, the root one when it saved none', () => {
        const socketio = { transport: 'socketio', url: 'http://localhost:3000' };

        expect(namespaceOf(connectionOf({ ...socketio, socketio: { namespace: '/orders' } }))).toBe(
            '/orders',
        );
        expect(namespaceOf(connectionOf(socketio))).toBe('/');
    });

    it('answers none for a websocket, which joins no namespace', () => {
        expect(namespaceOf(connectionOf({}))).toBeUndefined();
    });
});

describe('resolvedRetry', () => {
    it('answers the default policy when the file saved none', () => {
        expect(resolvedRetry(connectionOf({}))).toEqual({
            attempts: 5,
            enabled: true,
            initialWaitMs: 500,
            maximumWaitMs: 8_000,
            spread: 0.2,
        });
    });

    it('answers the saved policy over the default', () => {
        expect(
            resolvedRetry(
                connectionOf({
                    retry: { enabled: false, initialWaitMs: 250, maximumWaitMs: 4_000 },
                }),
            ),
        ).toEqual({
            attempts: 5,
            enabled: false,
            initialWaitMs: 250,
            maximumWaitMs: 4_000,
            spread: 0.2,
        });
    });
});

describe('resolvedKeepalive', () => {
    it('answers the default beat when the file saved nothing, and it is off', () => {
        expect(resolvedKeepalive(connectionOf({}))).toEqual({
            enabled: false,
            intervalMs: 30_000,
            pongTimeoutMs: 10_000,
        });
    });

    it('answers the saved beat over the default', () => {
        expect(
            resolvedKeepalive(connectionOf({ keepalive: { enabled: true, intervalMs: 5_000 } })),
        ).toEqual({
            enabled: true,
            intervalMs: 5_000,
            pongTimeoutMs: 10_000,
        });
    });
});

describe('the defaults of the app under what a connection saved', () => {
    const DEFAULTS = {
        handshake: FACTORY_CONNECTION_DEFAULTS.handshake,
        keepalive: { enabled: true, intervalMs: 10_000, pongTimeoutMs: 2_000 },
        retry: { ...FACTORY_CONNECTION_DEFAULTS.retry, attempts: 9 },
        socketio: { ackTimeoutMs: 2_500, maximumMessageSizeKiB: 32 },
        websocket: { maximumMessageSizeKiB: 64, verifyCertificate: false },
    };

    it('fill every row the connection left alone', () => {
        const connection = connectionOf({});

        expect(resolvedRetry(connection, DEFAULTS).attempts).toBe(9);
        expect(resolvedKeepalive(connection, DEFAULTS)).toEqual(DEFAULTS.keepalive);
        expect(resolvedWebsocket(connection, DEFAULTS)).toEqual({
            maximumMessageSizeKiB: 64,
            subprotocols: [],
            verifyCertificate: false,
        });
        expect(resolvedSocketio(connection, DEFAULTS).ackTimeoutMs).toBe(2_500);
        expect(resolvedSocketio(connection, DEFAULTS).maximumMessageSizeKiB).toBe(32);
    });

    it('never reach a row the connection decided', () => {
        const connection = connectionOf({
            keepalive: { enabled: false },
            websocket: { verifyCertificate: true },
        });

        expect(resolvedKeepalive(connection, DEFAULTS).enabled).toBe(false);
        expect(resolvedWebsocket(connection, DEFAULTS).verifyCertificate).toBe(true);
        expect(
            resolvedSocketio(connectionOf({ socketio: { maximumMessageSizeKiB: 8 } }), DEFAULTS)
                .maximumMessageSizeKiB,
        ).toBe(8);
    });
});
