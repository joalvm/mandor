import { describe, expect, it } from 'vitest';

import { recordStopRequestSchema } from '../../src/index.js';
import { recordStoppedSchema } from '../../src/record/record-stop.js';

describe('the answer of a stopped recording', () => {
    it('says where the file stayed and how much of the session it holds', () => {
        expect(recordStoppedSchema.parse({ entries: 41, path: '/tmp/echo.jsonl' })).toEqual({
            entries: 41,
            path: '/tmp/echo.jsonl',
        });
    });

    it('refuses a negative count of entries', () => {
        expect(
            recordStoppedSchema.safeParse({ entries: -1, path: '/tmp/echo.jsonl' }).success,
        ).toBe(false);
    });

    it('takes the connection the recording belonged to', () => {
        expect(recordStopRequestSchema.parse({ connectionId: 'echo' })).toEqual({
            connectionId: 'echo',
        });
    });
});
