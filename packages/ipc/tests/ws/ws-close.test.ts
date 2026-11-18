import { describe, expect, it } from 'vitest';

import { wsCloseRequestSchema } from '../../src/ws/ws-close.js';

describe('wsCloseRequestSchema', () => {
    it('names the connection whose socket closes', () => {
        expect(wsCloseRequestSchema.parse({ connectionId: 'gateway' })).toEqual({
            connectionId: 'gateway',
        });
    });

    it('refuses a connection id that is not one id segment', () => {
        expect(wsCloseRequestSchema.safeParse({ connectionId: '../gateway' }).success).toBe(false);
    });

    it('refuses a request that names no connection', () => {
        expect(wsCloseRequestSchema.safeParse({}).success).toBe(false);
    });
});
