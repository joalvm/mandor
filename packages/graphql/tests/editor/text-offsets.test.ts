import { describe, expect, it } from 'vitest';

import { offsetOf, positionOf } from '../../src/editor/text-offsets.js';

const TEXT = 'query {\n  a\n}\n';

describe('the places of a text', () => {
    it('says the line and the character an offset is on, both from zero', () => {
        expect(positionOf(TEXT, 0)).toEqual({ line: 0, character: 0 });
        expect(positionOf(TEXT, 7)).toEqual({ line: 0, character: 7 });
        expect(positionOf(TEXT, 8)).toEqual({ line: 1, character: 0 });
        expect(positionOf(TEXT, 11)).toEqual({ line: 1, character: 3 });
    });

    it('puts an offset past the end at the end, and one before the start at the start', () => {
        expect(positionOf(TEXT, 999)).toEqual({ line: 3, character: 0 });
        expect(positionOf(TEXT, -4)).toEqual({ line: 0, character: 0 });
    });

    it('is undone by offsetOf', () => {
        for (const offset of [0, 3, 7, 8, 10, TEXT.length]) {
            expect(offsetOf(TEXT, positionOf(TEXT, offset))).toBe(offset);
        }
    });

    it('keeps a character that is past the end of its line on that line', () => {
        expect(offsetOf(TEXT, { line: 0, character: 99 })).toBe(7);
    });

    it('puts a line that does not exist at the end of the text', () => {
        expect(offsetOf(TEXT, { line: 40, character: 0 })).toBe(TEXT.length);
    });

    it('reads a line that is the last one, with or without a newline after it', () => {
        expect(offsetOf('ab\ncd', { line: 1, character: 1 })).toBe(4);
        expect(offsetOf('ab\ncd', { line: 1, character: 9 })).toBe(5);
        expect(offsetOf('ab\n', { line: 1, character: 0 })).toBe(3);
    });

    it('takes a negative character or line as the start', () => {
        expect(offsetOf(TEXT, { line: 0, character: -3 })).toBe(0);
        expect(offsetOf(TEXT, { line: -1, character: 2 })).toBe(2);
    });
});
