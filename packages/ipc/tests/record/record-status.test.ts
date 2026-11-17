import { describe, expect, it } from 'vitest';

import { recordStatusRequestSchema } from '../../src/index.js';
import { recordStatusSchema } from '../../src/record/record-status.js';

describe('the status of one recording', () => {
    it('says whether the connection is being written, and how much it holds', () => {
        expect(recordStatusSchema.parse({ active: true, entries: 7 })).toEqual({
            active: true,
            entries: 7,
        });
    });

    it('refuses a status that is not a boolean and a count', () => {
        expect(recordStatusSchema.safeParse({ active: 'yes', entries: 0 }).success).toBe(false);
    });

    it('takes the connection the status is asked of', () => {
        expect(recordStatusRequestSchema.parse({ connectionId: 'echo' })).toEqual({
            connectionId: 'echo',
        });
    });
});
