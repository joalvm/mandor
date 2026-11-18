import { describe, expect, it } from 'vitest';

import { wsStatePushSchema } from '../../src/index.js';

describe('ws:state push', () => {
    it('accepts a state of the socket life cycle', () => {
        const push = { connectionId: 'gateway', state: 'open' };

        expect(wsStatePushSchema.parse(push)).toEqual(push);
    });

    it('carries why the attempt before a retry could not open', () => {
        const push = { attempt: 2, connectionId: 'gateway', reason: 'tls', state: 'reconnecting' };

        expect(wsStatePushSchema.parse(push)).toEqual(push);
    });

    it('rejects a state the socket can never be in', () => {
        const result = wsStatePushSchema.safeParse({ connectionId: 'gateway', state: 'sleeping' });

        expect(result.success).toBe(false);
    });
});
