import { describe, expect, it } from 'vitest';

import { trailShown } from '../../../src/components/panel/breadcrumbs-trail.js';

const TRAIL = ['Session', 'Forget Password', 'Reset', 'Change Password'];

describe('the stretches a trail draws', () => {
    it('draws every stretch of a whole trail, each at its place', () => {
        expect(trailShown(TRAIL, false).map(({ at, text }) => [at, text])).toEqual([
            [0, 'Session'],
            [1, 'Forget Password'],
            [2, 'Reset'],
            [3, 'Change Password'],
        ]);
    });

    it('keeps the first and the last of a folded trail, with the middle in one fold', () => {
        expect(trailShown(TRAIL, true)).toEqual([
            { at: 0, folded: [], text: 'Session' },
            { at: 1, folded: ['Forget Password', 'Reset'], text: '…' },
            { at: 3, folded: [], text: 'Change Password' },
        ]);
    });

    it('folds nothing in a trail of two, which has no middle', () => {
        expect(trailShown(['Session', 'Login'], true).map(({ text }) => text)).toEqual([
            'Session',
            'Login',
        ]);
    });
});
