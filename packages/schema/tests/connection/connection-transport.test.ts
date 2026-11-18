import { describe, expect, it } from 'vitest';

import { CONNECTION_TRANSPORTS, DEFAULT_CONNECTION_TRANSPORT } from '../../src/index.js';

describe('CONNECTION_TRANSPORTS', () => {
    it('offers websocket first and socket.io second, closed', () => {
        expect(CONNECTION_TRANSPORTS).toEqual(['websocket', 'socketio']);
    });

    it('starts every new connection as a websocket', () => {
        expect(DEFAULT_CONNECTION_TRANSPORT).toBe('websocket');
    });
});
