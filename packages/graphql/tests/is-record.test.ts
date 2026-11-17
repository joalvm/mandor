import { describe, expect, it } from 'vitest';

import { isRecord } from '../src/is-record.js';

describe('isRecord', () => {
    it('takes an object for a record', () => {
        expect(isRecord({ data: null })).toBe(true);
    });

    it.each([null, [], 'text', 1, undefined])('refuses %j, which has no keys to read', (value) => {
        expect(isRecord(value)).toBe(false);
    });
});
