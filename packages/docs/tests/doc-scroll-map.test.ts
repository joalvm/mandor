import { describe, expect, it } from 'vitest';

import { lineForTop, topForLine, type DocAnchor } from '../src/lib/doc-scroll-map.js';

/** A heading, a paragraph of ten lines, and the heading that follows them. */
const ANCHORS: DocAnchor[] = [
    { line: 1, top: 0 },
    { line: 3, top: 100 },
    { line: 13, top: 300 },
];

describe('matching a line of markdown with a place on the page', () => {
    it('puts the page where the block of that line starts', () => {
        expect(topForLine(ANCHORS, 3)).toBe(100);
        expect(topForLine(ANCHORS, 13)).toBe(300);
    });

    /** A block of ten lines is ten even steps down its own height, which is near enough. */
    it('reads straight across between two blocks', () => {
        expect(topForLine(ANCHORS, 8)).toBe(200);
    });

    it('stays at the top on the first line, and on a page with no block at all', () => {
        expect(topForLine(ANCHORS, 1)).toBe(0);
        expect(topForLine([], 40)).toBe(0);
    });

    it('holds at the last block for a line below every one of them', () => {
        expect(topForLine(ANCHORS, 90)).toBe(300);
    });
});

describe('matching a place on the page with a line of markdown', () => {
    it('answers the line of the block that is at the top', () => {
        expect(lineForTop(ANCHORS, 100)).toBe(3);
        expect(lineForTop(ANCHORS, 300)).toBe(13);
    });

    it('reads straight across between two blocks, and lands on a whole line', () => {
        expect(lineForTop(ANCHORS, 200)).toBe(8);
    });

    it('opens on the first line while there is nothing to go by', () => {
        expect(lineForTop([], 240)).toBe(1);
        expect(lineForTop(ANCHORS, -20)).toBe(1);
    });
});
