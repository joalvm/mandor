import { describe, expect, it } from 'vitest';

import { scaleTokenValues } from '../../src/styles/token-scale-values.js';
import { TREE_INDENT } from '../../src/styles/tree-indent.js';

describe('how far one level of a tree steps in', () => {
    it('is the number of pixels the scale holds for it', () => {
        expect(TREE_INDENT).toBe(Number.parseFloat(scaleTokenValues['mandor-indent-tree']));
    });

    it('is a positive measure a gesture can do arithmetic with', () => {
        expect(Number.isFinite(TREE_INDENT)).toBe(true);
        expect(TREE_INDENT).toBeGreaterThan(0);
    });
});
