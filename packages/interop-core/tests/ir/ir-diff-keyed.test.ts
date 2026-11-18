import { describe, expect, it } from 'vitest';

import { equalDiff, keyed, sameSet } from '../../src/ir/ir-diff-keyed.js';

describe('the keyed section of a difference', () => {
    it('names the members of one side and the pairs that disagree', () => {
        const differences = keyed(
            'pets',
            [
                { name: 'lola', age: 3 },
                { name: 'tito', age: 5 },
            ],
            [{ name: 'lola', age: 4 }],
            equalDiff,
        );

        expect(differences).toEqual(['pets.lola', 'pets.tito']);
    });

    it('answers nothing when every pair says the same', () => {
        const differences = keyed(
            'pets',
            [{ name: 'lola', age: 3 }],
            [{ name: 'lola', age: 3 }],
            equalDiff,
        );

        expect(differences).toEqual([]);
    });
});

describe('the set whose order says nothing', () => {
    it('answers the same set however it is ordered, and none for what is missing', () => {
        expect(sameSet(['b', 'a'], ['a', 'b'])).toBe(true);
        expect(sameSet(['a'], ['a', 'b'])).toBe(false);
        expect(sameSet(undefined, [])).toBe(true);
    });
});
