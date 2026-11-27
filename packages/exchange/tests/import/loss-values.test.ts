import { describe, expect, it } from 'vitest';

import { lossValues } from '../../src/import/lib/loss-values.js';

describe('lossValues', () => {
    it('turns the count back into a number, so the words can take its plural form', () => {
        expect(lossValues({ count: '3', max: '50' })).toEqual({ count: 3, max: '50' });
    });

    it('leaves a loss without a count as it came', () => {
        const values = { name: 'auth' };

        expect(lossValues(values)).toBe(values);
    });
});
