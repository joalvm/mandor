import { describe, expect, it } from 'vitest';

import { formatElapsed } from '../../../../src/renderer/features/connections/lib/format-elapsed.js';

describe('the time a connection has been connected', () => {
    it.each([
        [0, '00:00'],
        [42_000, '00:42'],
        [61_999, '01:01'],
        [3_599_000, '59:59'],
        [3_723_000, '1:02:03'],
        [-5_000, '00:00'],
    ])('says %i ms as %s', (milliseconds, said) => {
        expect(formatElapsed(milliseconds)).toBe(said);
    });
});
