import { describe, expect, it } from 'vitest';

import { CONNECTION_TRANSPORTS } from '../../src/connection/connection-transport.js';
import { connectionTransportSchema } from '../../src/connection/connection-transport-schema.js';

describe('connectionTransportSchema', () => {
    it('accepts every transport the picker offers', () => {
        for (const transport of CONNECTION_TRANSPORTS) {
            expect(connectionTransportSchema.safeParse(transport)).toEqual({
                success: true,
                data: transport,
            });
        }
    });

    it('parses a websocket transport to itself', () => {
        expect(connectionTransportSchema.parse('websocket')).toBe('websocket');
    });

    it('refuses a transport the domain does not know', () => {
        expect(connectionTransportSchema.safeParse('mqtt').success).toBe(false);
    });

    it('refuses a value that is not a transport name at all', () => {
        expect(connectionTransportSchema.safeParse('WebSocket').success).toBe(false);
        expect(connectionTransportSchema.safeParse(42).success).toBe(false);
        expect(connectionTransportSchema.safeParse(null).success).toBe(false);
        expect(connectionTransportSchema.safeParse(undefined).success).toBe(false);
    });
});
