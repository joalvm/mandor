import { describe, expect, it } from 'vitest';

import { SHORTEST_SECRET, tooShortToHide } from '../../src/redaction/too-short-to-hide.js';

describe('tooShortToHide', () => {
    it('reads the threshold as the shortest value it will hide', () => {
        expect(tooShortToHide('x'.repeat(SHORTEST_SECRET))).toBe(false);
        expect(tooShortToHide('x'.repeat(SHORTEST_SECRET - 1))).toBe(true);
    });
});
