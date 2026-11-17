import { parseTree, type Node } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import { closestRangeOf, rangeOfPointer } from '../../src/text-range/range-of-pointer.js';

describe('rangeOfPointer', () => {
    const text = '{\n  // owner\n  "a/b": [1, {"c": true}],\n}';

    it('lands on the value a pointer names, keys escaped and ranks read', () => {
        const range = rangeOfPointer(text, '/a~1b/1/c');

        expect(range === undefined ? '' : text.slice(range.from, range.to)).toBe('true');
    });

    it('lands on the whole document for the empty pointer', () => {
        expect(rangeOfPointer(text, '')).toEqual({ from: 0, to: text.length });
    });

    it('lands nowhere when the pointer leaves the document or the text is broken', () => {
        expect(rangeOfPointer(text, '/a~1b/x')).toBeUndefined();
        expect(rangeOfPointer(text, '/a~1b/0/c')).toBeUndefined();
        expect(rangeOfPointer(text, '/missing')).toBeUndefined();
        expect(rangeOfPointer('{"a": ', '/a')).toBeUndefined();
        expect(rangeOfPointer('', '')).toBeUndefined();
    });
});

function rootOf(text: string): Node {
    const root = parseTree(text);

    if (root === undefined) {
        throw new Error('the fixture does not parse');
    }

    return root;
}

describe('closestRangeOf', () => {
    const text = '{"a": [1, {"c": true}]}';
    const root = rootOf(text);

    function landing(pointer: string): string {
        const range = closestRangeOf(root, pointer);

        return text.slice(range.from, range.to);
    }

    it('lands where the pointer names, when the document holds it', () => {
        expect(landing('/a/1/c')).toBe('true');
    });

    /** A refusal is never lost: it is shown on what the text does hold of the way to it. */
    it('lands on the last value the walk reached when the pointer leaves the document', () => {
        expect(landing('/a/1/missing')).toBe('{"c": true}');
        expect(landing('/a/7')).toBe('[1, {"c": true}]');
        expect(landing('/missing')).toBe(text);
    });
});
