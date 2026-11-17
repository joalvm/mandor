import { describe, expect, it } from 'vitest';

import { isRecord } from '../../src/ir/is-record.js';

describe('telling a record apart from anything else a document can hold', () => {
    it('takes a plain object, empty or not', () => {
        expect(isRecord({})).toBe(true);
        expect(isRecord({ type: 'object' })).toBe(true);
    });

    /** A list is an object to `typeof`; read as a record, its indexes would pass for keys. */
    it('refuses a list, null and every scalar', () => {
        expect(isRecord([])).toBe(false);
        expect(isRecord(null)).toBe(false);
        expect(isRecord(undefined)).toBe(false);
        expect(isRecord('object')).toBe(false);
        expect(isRecord(1)).toBe(false);
    });
});
