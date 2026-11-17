import { describe, expect, it } from 'vitest';

import { recordRevealRequestSchema } from '../../src/index.js';

describe('the request that reveals a recorded file', () => {
    it('takes the path the file was written to', () => {
        expect(recordRevealRequestSchema.parse({ path: '/tmp/echo.jsonl' })).toEqual({
            path: '/tmp/echo.jsonl',
        });
    });

    it('refuses a request without a path', () => {
        expect(recordRevealRequestSchema.safeParse({}).success).toBe(false);
    });
});
