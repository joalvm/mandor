import { describe, expect, it } from 'vitest';

import { recordStartRequestSchema } from '../../src/index.js';

describe('the request that starts a recording', () => {
    it('takes the connection and the path the user already picked', () => {
        const request = { connectionId: 'echo', path: '/tmp/echo.jsonl' };

        expect(recordStartRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a recording without a path the user chose', () => {
        expect(recordStartRequestSchema.safeParse({ connectionId: 'echo' }).success).toBe(false);
    });

    it('refuses an empty path', () => {
        expect(recordStartRequestSchema.safeParse({ connectionId: 'echo', path: '' }).success).toBe(
            false,
        );
    });
});
