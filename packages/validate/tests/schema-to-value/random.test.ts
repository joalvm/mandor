import { describe, expect, it } from 'vitest';

import { mulberry32 } from '../../src/schema-to-value/random.js';

describe('mulberry32', () => {
    it('draws the same sequence twice from the same seed', () => {
        const one = mulberry32(42);
        const other = mulberry32(42);

        expect([one(), one(), one()]).toEqual([other(), other(), other()]);
    });

    it('draws another sequence from another seed', () => {
        const one = mulberry32(1);
        const other = mulberry32(2);

        expect(one()).not.toBe(other());
    });

    it('draws fractions between 0 and 1', () => {
        const draw = mulberry32(7);

        for (let step = 0; step < 100; step += 1) {
            const value = draw();

            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });
});
