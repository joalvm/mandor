import { describe, expect, it } from 'vitest';

import { createConnection, FormatError, parseConnection } from '../../src/index.js';

describe('createConnection', () => {
    it('returns a connection that passes its own parse', () => {
        const connection = createConnection({
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'wss://example.com/socket',
        });

        expect(parseConnection(connection)).toEqual(connection);
        expect(connection.id).toBe('gateway-local');
        expect(connection.transport).toBe('websocket');
        expect(connection.headers).toEqual([]);
        expect(connection.environmentId).toBeNull();
    });

    it('creates a socket.io connection when the transport says so', () => {
        const connection = createConnection({
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'https://example.com',
            transport: 'socketio',
        });

        expect(parseConnection(connection)).toEqual(connection);
        expect(connection.transport).toBe('socketio');
    });

    it('keeps the headers and environment given', () => {
        const connection = createConnection({
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'wss://example.com/socket',
            headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
            environmentId: 'local',
        });

        expect(connection.environmentId).toBe('local');
        expect(connection.headers).toEqual([
            { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
        ]);
    });

    it('keeps the parts a document carries beside the address', () => {
        const connection = createConnection({
            id: 'pedidos',
            name: 'Pedidos',
            url: 'wss://example.com/socket',
            params: [{ key: 'room', value: 'lobby', enabled: true }],
            description: 'Canal de pedidos.',
            auth: { type: 'bearer', token: '{{token}}' },
            websocket: { subprotocols: ['json'] },
        });

        expect(parseConnection(connection)).toEqual(connection);
        expect(connection).toMatchObject({
            params: [{ key: 'room', value: 'lobby', enabled: true }],
            description: 'Canal de pedidos.',
            auth: { type: 'bearer', token: '{{token}}' },
            websocket: { subprotocols: ['json'] },
        });
    });

    it('rejects a URL that is not a websocket URL', () => {
        expect(() =>
            createConnection({
                id: 'gateway-local',
                name: 'Gateway local',
                url: 'https://example.com',
            }),
        ).toThrow(FormatError);
    });

    it('does not retain the mutable headers passed by the caller', () => {
        const header = { key: 'Authorization', value: 'Bearer token', enabled: true };
        const connection = createConnection({
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'wss://example.com/socket',
            headers: [header],
        });

        header.value = 'changed';

        expect(connection.headers[0]?.value).toBe('Bearer token');
    });
});
