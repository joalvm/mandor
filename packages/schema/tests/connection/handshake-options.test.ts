import { describe, expect, it } from 'vitest';

import { parseConnection } from '../../src/index.js';
import {
    DEFAULT_HANDSHAKE_OPTIONS,
    handshakeOptionsSchema,
} from '../../src/connection/handshake-options.js';

describe('the handshake of a connection', () => {
    it('gives an unanswered handshake up after twenty seconds by default', () => {
        expect(DEFAULT_HANDSHAKE_OPTIONS).toEqual({ timeoutMs: 20_000 });
    });

    it('refuses a timeout that could never be waited', () => {
        expect(handshakeOptionsSchema.safeParse({ timeoutMs: 0 }).success).toBe(false);
        expect(handshakeOptionsSchema.safeParse({ timeoutMs: 600_001 }).success).toBe(false);
    });

    it('rides the connection file that names it', () => {
        const connection = parseConnection({
            environmentId: null,
            headers: [],
            id: 'orders',
            name: 'Orders',
            url: 'ws://localhost:3000',
            handshake: { timeoutMs: 5_000 },
        });

        expect(connection.handshake).toEqual({ timeoutMs: 5_000 });
    });
});
