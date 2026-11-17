import { describe, expect, it } from 'vitest';

import type { Connection } from '../../src/index.js';

describe('Connection', () => {
    it('is a plain data shape with the environment left explicit', () => {
        const connection: Connection = {
            id: 'gateway-local',
            name: 'Gateway local',
            transport: 'websocket',
            url: 'wss://example.com/socket',
            headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
            environmentId: null,
        };

        expect(connection.environmentId).toBeNull();
    });
});
