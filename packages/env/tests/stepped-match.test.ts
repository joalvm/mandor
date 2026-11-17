import { describe, expect, it } from 'vitest';

import { steppedMatch } from '../src/lib/stepped-match.js';

const MATCHES = ['accept', 'authorization', 'cookie'];

describe('the match a step moves to (steppedMatch)', () => {
    it('goes down to the first one when none is active yet', () => {
        expect(steppedMatch(MATCHES, null, 1)).toBe('accept');
    });

    it('wraps past the last one going down and past the first going up', () => {
        expect(steppedMatch(MATCHES, 'cookie', 1)).toBe('accept');
        expect(steppedMatch(MATCHES, 'accept', -1)).toBe('cookie');
    });

    it('has nothing to move to in an empty list', () => {
        expect(steppedMatch([], null, -1)).toBeNull();
    });
});
