import { describe, expect, it } from 'vitest';

import { outOfView, scrollShowing } from '../../../src/components/tabs/tabs-fit.js';

/** Four sections of 80 side by side. */
const SPANS = [0, 80, 160, 240].map((start) => ({ start, width: 80 }));

describe('which sections of a strip fit', () => {
    it('leaves the list where it is while the open section is whole in view', () => {
        expect(scrollShowing(SPANS, 1, 0, 170)).toBe(0);
        expect(scrollShowing(SPANS, 9, 40, 170)).toBe(40);
    });

    it('scrolls as little as it takes to show the open section, either way', () => {
        expect(scrollShowing(SPANS, 3, 0, 170)).toBe(150);
        expect(scrollShowing(SPANS, 0, 150, 170)).toBe(0);
    });

    it('counts out of view what is cut on either side, and forgives half a pixel', () => {
        expect(outOfView(SPANS, 0, 170)).toEqual([2, 3]);
        expect(outOfView(SPANS, 150, 170)).toEqual([0, 1]);
        expect(outOfView(SPANS, 0, 319.6)).toEqual([]);
    });
});
