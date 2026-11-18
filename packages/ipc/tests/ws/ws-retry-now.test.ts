import { describe, expect, it } from 'vitest';

import { wsRetryNowRequestSchema } from '../../src/index.js';

describe('ws:retry-now payload', () => {
    it('accepts the id of the connection to retry', () => {
        expect(wsRetryNowRequestSchema.parse({ connectionId: 'gateway' })).toEqual({
            connectionId: 'gateway',
        });
    });

    it('rejects a connection id that is not a slug', () => {
        const result = wsRetryNowRequestSchema.safeParse({ connectionId: 'not a slug' });

        expect(result.success).toBe(false);
    });

    it('rejects a request that names no connection', () => {
        const result = wsRetryNowRequestSchema.safeParse({});

        expect(result.success).toBe(false);
    });
});
