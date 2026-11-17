import { describe, expect, it } from 'vitest';

import { isRecord } from '../../src/validate-value/schema-issue.js';

describe('the words of a schema issue', () => {
    it('reads an object as a record, and never an array or a null', () => {
        expect(isRecord({})).toBe(true);
        expect(isRecord([])).toBe(false);
        expect(isRecord(null)).toBe(false);
        expect(isRecord('hola')).toBe(false);
    });
});
