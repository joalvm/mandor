import { describe, expect, it } from 'vitest';

import {
    descendantIdsOf,
    firstChildIndexOf,
    parentIndexOf,
    tabStopOf,
    type TreeLine,
} from '../../../src/components/tree/tree-line.js';

/** Two folders, one open with a leaf and a closed folder inside it, and a leaf at the root. */
const LINES: readonly TreeLine[] = [
    { expanded: true, id: 'orders', level: 1 },
    { id: 'orders/created', level: 2 },
    { expanded: false, id: 'orders/archive', level: 2 },
    { expanded: true, id: 'users', level: 1 },
    { id: 'users/signed-up', level: 2 },
    { id: 'readme', level: 1 },
];

describe('the lines of a tree', () => {
    it('finds the folder a line hangs from, and nothing above the first level', () => {
        expect(parentIndexOf(LINES, 1)).toBe(0);
        expect(parentIndexOf(LINES, 2)).toBe(0);
        expect(parentIndexOf(LINES, 4)).toBe(3);
        expect(parentIndexOf(LINES, 0)).toBe(-1);
        expect(parentIndexOf(LINES, 5)).toBe(-1);
    });

    it('finds the first child of an open folder only', () => {
        expect(firstChildIndexOf(LINES, 0)).toBe(1);
        expect(firstChildIndexOf(LINES, 3)).toBe(4);
        expect(firstChildIndexOf(LINES, 2)).toBe(-1);
        expect(firstChildIndexOf(LINES, 1)).toBe(-1);
    });

    /** An open folder with nothing under it has no child to step into. */
    it('finds no child under an open folder that holds nothing', () => {
        const lines: TreeLine[] = [
            { expanded: true, id: 'empty', level: 1 },
            { id: 'readme', level: 1 },
        ];

        expect(firstChildIndexOf(lines, 0)).toBe(-1);
    });

    it('lists what a fold would hide, down to the next line of its level', () => {
        expect(descendantIdsOf(LINES, 0)).toEqual(['orders/created', 'orders/archive']);
        expect(descendantIdsOf(LINES, 3)).toEqual(['users/signed-up']);
        expect(descendantIdsOf(LINES, 5)).toEqual([]);
    });

    it('puts the tab stop on the focused line, else the first taken, else the first drawn', () => {
        const drawn = [0, 1, 2, 3];

        expect(tabStopOf(LINES, drawn, 'orders/archive', new Set(['users']))).toBe(2);
        expect(tabStopOf(LINES, drawn, null, new Set(['users', 'orders/created']))).toBe(1);
        expect(tabStopOf(LINES, drawn, null, new Set())).toBe(0);
    });

    /** A focus scrolled out of the window cannot take the tabulator, or the tree is skipped. */
    it('keeps the tab stop on a drawn line when the focused one is out of the window', () => {
        expect(tabStopOf(LINES, [3, 4, 5], 'orders', new Set(['readme']))).toBe(5);
        expect(tabStopOf(LINES, [3, 4, 5], 'orders', new Set())).toBe(3);
        expect(tabStopOf(LINES, [], 'orders', new Set())).toBe(-1);
    });
});
