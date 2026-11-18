import { describe, expect, it } from 'vitest';

import { parseConnection, type Connection } from '@mandor/schema';

import {
    FACTORY_CONNECTION_DEFAULTS,
    resolvedHandshake,
    resolvedSocketio,
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

describe('resolvedSocketio', () => {
    it('answers the defaults of the domain when the file saved nothing', () => {
        expect(
            resolvedSocketio(
                connectionOf({ transport: 'socketio', url: 'https://localhost:3000' }),
            ),
        ).toEqual({
            ackTimeoutMs: 10_000,
            maximumMessageSizeKiB: 102_400,
            enginePath: '/socket.io',
            engineTransport: 'websocket-only',
            namespace: '/',
            version: 'v4',
        });
    });

    it('answers what the file saved over the default, field by field', () => {
        expect(
            resolvedSocketio(
                connectionOf({
                    socketio: { namespace: '/admin', engineTransport: 'polling-only' },
                    transport: 'socketio',
                    url: 'https://localhost:3000',
                }),
            ),
        ).toEqual({
            ackTimeoutMs: 10_000,
            maximumMessageSizeKiB: 102_400,
            enginePath: '/socket.io',
            engineTransport: 'polling-only',
            namespace: '/admin',
            version: 'v4',
        });
    });
});

describe('resolvedHandshake', () => {
    it('waits twenty seconds for the server when the file saved nothing', () => {
        expect(resolvedHandshake(connectionOf({}))).toEqual({ timeoutMs: 20_000 });
    });

    it('waits what the file saved over the default of the app', () => {
        const defaults = { ...FACTORY_CONNECTION_DEFAULTS, handshake: { timeoutMs: 9_000 } };

        expect(resolvedHandshake(connectionOf({}), defaults)).toEqual({ timeoutMs: 9_000 });
        expect(
            resolvedHandshake(connectionOf({ handshake: { timeoutMs: 1_500 } }), defaults),
        ).toEqual({ timeoutMs: 1_500 });
    });
});
