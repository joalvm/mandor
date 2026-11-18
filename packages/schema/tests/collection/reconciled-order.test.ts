import { describe, expect, it } from 'vitest';

import { reconciledOrder } from '../../src/index.js';

describe('reconciling a stated order against what is on disk', () => {
    it('keeps the order somebody chose when it matches what is there', () => {
        expect(reconciledOrder(['b', 'a'], ['a', 'b'])).toEqual(['b', 'a']);
    });

    /** A repo merged by hand arrives like this, and it cannot break the view. */
    it('drops names the order mentions and disk does not have', () => {
        expect(reconciledOrder(['b', 'gone', 'a'], ['a', 'b'])).toEqual(['b', 'a']);
    });

    it('puts names the order forgot behind the rest, by name', () => {
        expect(reconciledOrder(['b'], ['b', 'z', 'c'])).toEqual(['b', 'c', 'z']);
    });

    it('names a child once even when the order names it twice', () => {
        expect(reconciledOrder(['a', 'a', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
    });

    it('sorts by name when nobody has arranged anything', () => {
        expect(reconciledOrder([], ['z', 'a'])).toEqual(['a', 'z']);
    });
});
