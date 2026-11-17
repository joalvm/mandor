import { describe, expect, it } from 'vitest';

import { isWholeCount } from '../../../src/components/input/whole-count.js';

describe('a whole count typed in a box', () => {
    it('keeps digits that reach the floor', () => {
        expect(isWholeCount('3', 1)).toBe(true);
        expect(isWholeCount('0', 0)).toBe(true);
    });

    it('turns down what is half written, signed, fractional or under the floor', () => {
        expect(isWholeCount('', 0)).toBe(false);
        expect(isWholeCount('-1', 0)).toBe(false);
        expect(isWholeCount('1.5', 0)).toBe(false);
        expect(isWholeCount('0', 1)).toBe(false);
    });
});
