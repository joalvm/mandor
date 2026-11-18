import type { Connection } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { serverOfConnection } from '../../src/workspace/servers-of-connections.js';

function connection(overrides: Partial<Connection> = {}): Connection {
    return {
        id: 'pasarela',
        name: 'pasarela',
        transport: 'websocket',
        url: 'wss://pasarela.ejemplo.com/v1',
        headers: [],
        environmentId: null,
        ...overrides,
    };
}

describe('one connection as the server it dials', () => {
    it('speaks the url it dials and the protocol its transport says', () => {
        expect(serverOfConnection(connection())).toEqual({
            name: 'pasarela',
            url: 'wss://pasarela.ejemplo.com/v1',
            protocol: 'wss',
            security: [],
            variables: {},
            extras: {},
        });
    });

    it('names the protocol a socket.io dials, and the scheme of a plain websocket', () => {
        expect(
            serverOfConnection(
                connection({ transport: 'socketio', url: 'https://tienda.ejemplo.com' }),
            ).protocol,
        ).toBe('socket.io');
        expect(serverOfConnection(connection({ url: 'ws://a.b/v1' })).protocol).toBe('ws');
    });
});
