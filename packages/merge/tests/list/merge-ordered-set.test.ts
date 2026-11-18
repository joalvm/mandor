import { describe, expect, it } from 'vitest';

import { mergeOrderedSet } from '../../src/list/merge-ordered-set.js';

describe('merging an ordered set of strings', () => {
    it('applies the removals of either side', () => {
        expect(mergeOrderedSet(['a', 'b', 'c'], ['a', 'c'], ['a', 'b', 'c'])).toEqual(['a', 'c']);
        expect(mergeOrderedSet(['a', 'b', 'c'], ['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c']);
        expect(mergeOrderedSet(['a', 'b', 'c'], ['a', 'c'], ['b', 'c'])).toEqual(['c']);
    });

    it('puts what theirs added after the neighbour it had, in the order of ours', () => {
        expect(mergeOrderedSet(['a', 'b'], ['a', 'b'], ['a', 'x', 'b', 'y'])).toEqual([
            'a',
            'x',
            'b',
            'y',
        ]);
    });

    it('puts what theirs added first at the start', () => {
        expect(mergeOrderedSet(['a'], ['a'], ['x', 'a'])).toEqual(['x', 'a']);
    });

    it('keeps what ours added where ours put it', () => {
        expect(mergeOrderedSet(['a'], ['a', 'z'], ['a', 'x'])).toEqual(['a', 'x', 'z']);
    });

    it('does not repeat what both sides added', () => {
        expect(mergeOrderedSet([], ['a'], ['a'])).toEqual(['a']);
    });

    it('looks further back for a neighbour when the nearest one is gone from ours', () => {
        expect(mergeOrderedSet(['a', 'b'], ['a'], ['a', 'b', 'x'])).toEqual(['a', 'x']);
    });

    it('does not bring back what ours removed and theirs kept', () => {
        expect(mergeOrderedSet(['a', 'b'], ['a'], ['a', 'b'])).toEqual(['a']);
    });

    it('puts what theirs added after a neighbour it repeats right next to it', () => {
        expect(mergeOrderedSet([], ['a', 'b'], ['a', 'x', 'a', 'y'])).toEqual(['a', 'y', 'x', 'b']);
    });

    /** Every step searched and spliced the whole list: fifty thousand items took a minute and a half. */
    it('merges lists of tens of thousands of items in one walk', () => {
        const count = 50_000;
        const base = Array.from({ length: count }, (_, index) => `r${String(index)}`);
        const ours = [...base, ...base.map((item) => `${item}-ours`)];
        const theirs = [...base, ...base.map((item) => `${item}-theirs`)];

        const merged = mergeOrderedSet(base, ours, theirs);

        expect(merged).toHaveLength(count * 3);
        expect(merged.slice(count - 1, count + 2)).toEqual([
            `r${String(count - 1)}`,
            'r0-theirs',
            'r1-theirs',
        ]);
        expect(merged.at(-1)).toBe(`r${String(count - 1)}-ours`);
    });

    it('never asks about the order: ours decides', () => {
        expect(mergeOrderedSet(['a', 'b', 'c'], ['c', 'a', 'b'], ['b', 'a', 'c'])).toEqual([
            'c',
            'a',
            'b',
        ]);
    });
});
