import { describe, expect, it } from 'vitest';

import { errorCodeSchema } from '../../src/index.js';

describe('ErrorCode', () => {
    /** The interface decides on the code alone: two failures under one name could not be told apart. */
    it('names each failure once', () => {
        const codes = errorCodeSchema.options;

        expect(new Set(codes).size).toBe(codes.length);
    });

    it('refuses a code the bridge does not know', () => {
        expect(errorCodeSchema.safeParse('ws-exploded').success).toBe(false);
    });
});
