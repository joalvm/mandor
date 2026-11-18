import { describe, expect, it } from 'vitest';

import { emptyAsAbsent } from '../src/lib/empty-as-absent.js';

describe('an optional field of a level', () => {
    it('is written as typed, and not at all once emptied', () => {
        expect(emptyAsAbsent('read:orders')).toBe('read:orders');
        expect(emptyAsAbsent('')).toBeUndefined();
    });
});
