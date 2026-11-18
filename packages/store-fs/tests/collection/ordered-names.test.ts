import { describe, expect, it } from 'vitest';

import {
    orderPlacing,
    orderRenaming,
    orderWith,
    orderWithout,
} from '../../src/collection/ordered-names.js';

describe('renaming a name inside an order', () => {
    it('keeps the position the old name had', () => {
        expect(orderRenaming(['a', 'b', 'c'], 'b', 'z')).toEqual(['a', 'z', 'c']);
    });

    it('adds the new name last when the order never mentioned the old one', () => {
        expect(orderRenaming(['a'], 'ghost', 'z')).toEqual(['a', 'z']);
    });
});

describe('adding and removing names', () => {
    it('puts what arrives last', () => {
        expect(orderWith(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    });

    it('takes a name out and leaves the rest as they were', () => {
        expect(orderWithout(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    });

    it('does not change the order it was given', () => {
        const order = ['a', 'b'];

        orderWith(order, 'c');
        orderWithout(order, 'a');

        expect(order).toEqual(['a', 'b']);
    });
});

describe('placing a name above a sibling', () => {
    it('lands above the sibling it was dropped on', () => {
        expect(orderPlacing(['a', 'b', 'c'], { name: 'c', before: 'a' })).toEqual(['c', 'a', 'b']);
    });

    it('goes last when nothing comes after it', () => {
        expect(orderPlacing(['a', 'b', 'c'], { name: 'a', before: null })).toEqual(['b', 'c', 'a']);
    });

    it('goes last when the sibling is one the order never mentioned', () => {
        expect(orderPlacing(['a', 'b'], { name: 'a', before: 'ghost' })).toEqual(['b', 'a']);
    });

    it('adds a name the order forgot, above its sibling', () => {
        expect(orderPlacing(['a', 'b'], { name: 'new', before: 'b' })).toEqual(['a', 'new', 'b']);
    });
});
