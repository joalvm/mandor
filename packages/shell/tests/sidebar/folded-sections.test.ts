import { describe, expect, it } from 'vitest';

import { withFolded } from '../../src/sidebar/folded-sections.js';

describe('the folded sections of the sidebar', () => {
    it('adds a section that folds after the ones already folded, once', () => {
        expect(withFolded(['docs'], 'collections', false)).toEqual(['docs', 'collections']);
        expect(withFolded(['docs', 'collections'], 'docs', false)).toEqual(['docs', 'collections']);
    });

    it('takes a section that opens out, leaving the rest in their order', () => {
        expect(withFolded(['docs', 'collections', 'env'], 'collections', true)).toEqual([
            'docs',
            'env',
        ]);
    });
});
