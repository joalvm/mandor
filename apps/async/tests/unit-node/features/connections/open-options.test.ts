import { describe, expect, it } from 'vitest';

import { parseConnection, type Connection } from '@mandor/schema';

import { FACTORY_CONNECTION_DEFAULTS } from '../../../../src/renderer/features/connections/lib/connection-settings.js';
import { openOptionsOf } from '../../../../src/renderer/features/connections/lib/open-options.js';

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

describe('openOptionsOf', () => {
    it('dials with the defaults of the app under what the connection saved', () => {
        const defaults = {
            ...FACTORY_CONNECTION_DEFAULTS,
            keepalive: { enabled: true, intervalMs: 1_000, pongTimeoutMs: 500 },
            retry: { ...FACTORY_CONNECTION_DEFAULTS.retry, attempts: 9 },
            websocket: { maximumMessageSizeKiB: 1, verifyCertificate: false },
        };
        const options = openOptionsOf(
            connectionOf({ websocket: { verifyCertificate: true } }),
            defaults,
        );

        expect(options).toEqual({
            handshakeTimeoutMs: 20_000,
            keepalive: { intervalMs: 1_000, pongTimeoutMs: 500 },
            maximumMessageSizeBytes: 1_024,
            reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: 9, spread: 0.2 },
            verifyCertificate: true,
        });
    });

    it('dials with the defaults of the domain when the connection saved nothing', () => {
        expect(openOptionsOf(connectionOf({}))).toEqual({
            handshakeTimeoutMs: 20_000,
            maximumMessageSizeBytes: 104_857_600,
            reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: 5, spread: 0.2 },
            verifyCertificate: true,
        });
    });

    it('waits for the handshake as long as the connection saved, or the app says', () => {
        const defaults = { ...FACTORY_CONNECTION_DEFAULTS, handshake: { timeoutMs: 3_000 } };

        expect(openOptionsOf(connectionOf({}), defaults).handshakeTimeoutMs).toBe(3_000);
        expect(
            openOptionsOf(connectionOf({ handshake: { timeoutMs: 750 } }), defaults)
                .handshakeTimeoutMs,
        ).toBe(750);
    });

    it('carries the subprotocols and the size the connection saved, in bytes', () => {
        const options = openOptionsOf(
            connectionOf({
                websocket: { maximumMessageSizeKiB: 64, subprotocols: ['graphql-ws'] },
            }),
        );

        expect(options.maximumMessageSizeBytes).toBe(65_536);
        expect(options.subprotocols).toEqual(['graphql-ws']);
    });

    it('turns a policy that is off into a policy that spends no attempt', () => {
        const options = openOptionsOf(
            connectionOf({ retry: { enabled: false, initialWaitMs: 250, maximumWaitMs: 4_000 } }),
        );

        expect(options.reconnect).toEqual({ baseMs: 0, ceilingMs: 0, maxAttempts: 0, spread: 0 });
    });

    it('shapes the policy the connection saved around the transport waits', () => {
        const options = openOptionsOf(
            connectionOf({
                retry: { attempts: 2, enabled: true, initialWaitMs: 250, maximumWaitMs: 4_000 },
            }),
        );

        expect(options.reconnect).toEqual({
            baseMs: 250,
            ceilingMs: 4_000,
            maxAttempts: 2,
            spread: 0.2,
        });
    });

    it('beats only when the keepalive was asked for', () => {
        const silent = openOptionsOf(connectionOf({}));
        const beating = openOptionsOf(
            connectionOf({ keepalive: { enabled: true, intervalMs: 5_000, pongTimeoutMs: 2_000 } }),
        );

        expect(silent.keepalive).toBeUndefined();
        expect(beating.keepalive).toEqual({ intervalMs: 5_000, pongTimeoutMs: 2_000 });
    });

    it('leaves the websocket settings out of a transport that dials nothing of the sort', () => {
        const options = openOptionsOf(
            connectionOf({ transport: 'socketio', url: 'http://localhost:3000' }),
        );

        expect(options.subprotocols).toBeUndefined();
        expect(options.verifyCertificate).toBeUndefined();
    });

    /** A Socket.IO frame is a websocket frame underneath, and takes the same ceiling. */
    it('gives Socket.IO the size it saved, or the one the app says, in bytes', () => {
        const defaults = {
            ...FACTORY_CONNECTION_DEFAULTS,
            socketio: { ...FACTORY_CONNECTION_DEFAULTS.socketio, maximumMessageSizeKiB: 2 },
        };
        const socketio = { transport: 'socketio', url: 'http://localhost:3000' };

        expect(openOptionsOf(connectionOf(socketio)).maximumMessageSizeBytes).toBe(104_857_600);
        expect(openOptionsOf(connectionOf(socketio), defaults).maximumMessageSizeBytes).toBe(2_048);
        expect(
            openOptionsOf(
                connectionOf({ ...socketio, socketio: { maximumMessageSizeKiB: 64 } }),
                defaults,
            ).maximumMessageSizeBytes,
        ).toBe(65_536);
    });
});
