import { describe, expect, it } from 'vitest';

import { computeDynamicValues } from '../../src/dynamic/compute-dynamic-values.js';
import { DYNAMIC_NAMES } from '../../src/dynamic/dynamic-names.js';

describe('DYNAMIC_NAMES', () => {
    it('names exactly the variables the engine computes', () => {
        expect([...DYNAMIC_NAMES].sort()).toEqual(Object.keys(computeDynamicValues()).sort());
    });

    it('writes every name as text references it, with the dollar sign in front', () => {
        for (const name of DYNAMIC_NAMES) {
            expect(name.startsWith('$')).toBe(true);
        }
    });

    it('keeps the order the display layer paints them in', () => {
        expect([...DYNAMIC_NAMES]).toEqual(['$uuid', '$timestamp', '$randomInt']);
    });
});
