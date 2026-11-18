import { describe, expect, it } from 'vitest';

import { requestCancelRequestSchema } from '../../src/index.js';

describe('the request of request:cancel', () => {
    it('names the send to cut by its id', () => {
        const sendId = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

        expect(requestCancelRequestSchema.parse({ sendId })).toEqual({ sendId });
    });

    it('refuses an id that is not a uuid', () => {
        expect(requestCancelRequestSchema.safeParse({ sendId: 'x' }).success).toBe(false);
    });
});
