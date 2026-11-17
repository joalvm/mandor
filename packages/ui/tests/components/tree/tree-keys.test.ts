import { describe, expect, it } from 'vitest';

import type { TreeLine } from '../../../src/components/tree/tree-line.js';
import { treeCommandOf, type TreeKey } from '../../../src/components/tree/tree-keys.js';

const LINES: readonly TreeLine[] = [
    { expanded: true, id: 'orders', level: 1 },
    { id: 'orders/created', level: 2 },
    { expanded: false, id: 'orders/archive', level: 2 },
    { id: 'readme', level: 1 },
];

function key(name: string, held: Partial<TreeKey> = {}): TreeKey {
    return {
        altKey: false,
        ctrlKey: false,
        key: name,
        metaKey: false,
        shiftKey: false,
        ...held,
    };
}

describe('the keys of a tree', () => {
    it('moves the focus a line down and up, and stops at the ends', () => {
        expect(treeCommandOf(key('ArrowDown'), LINES, 0)).toEqual({ index: 1, kind: 'focus' });
        expect(treeCommandOf(key('ArrowUp'), LINES, 1)).toEqual({ index: 0, kind: 'focus' });
        expect(treeCommandOf(key('ArrowDown'), LINES, 3)).toBeNull();
        expect(treeCommandOf(key('ArrowUp'), LINES, 0)).toBeNull();
    });

    it('jumps to the first and the last line', () => {
        expect(treeCommandOf(key('Home'), LINES, 2)).toEqual({ index: 0, kind: 'focus' });
        expect(treeCommandOf(key('End'), LINES, 1)).toEqual({ index: 3, kind: 'focus' });
    });

    it('extends the selection instead when Shift is held', () => {
        expect(treeCommandOf(key('ArrowDown', { shiftKey: true }), LINES, 0)).toEqual({
            index: 1,
            kind: 'extend',
        });
        expect(treeCommandOf(key('End', { shiftKey: true }), LINES, 0)).toEqual({
            index: 3,
            kind: 'extend',
        });
    });

    it('opens a closed folder to the right, and steps into an open one', () => {
        expect(treeCommandOf(key('ArrowRight'), LINES, 2)).toEqual({ index: 2, kind: 'expand' });
        expect(treeCommandOf(key('ArrowRight'), LINES, 0)).toEqual({ index: 1, kind: 'focus' });
        expect(treeCommandOf(key('ArrowRight'), LINES, 1)).toBeNull();
    });

    it('closes an open folder to the left, and steps out to the parent otherwise', () => {
        expect(treeCommandOf(key('ArrowLeft'), LINES, 0)).toEqual({ index: 0, kind: 'collapse' });
        expect(treeCommandOf(key('ArrowLeft'), LINES, 2)).toEqual({ index: 0, kind: 'focus' });
        expect(treeCommandOf(key('ArrowLeft'), LINES, 3)).toBeNull();
    });

    it('presses the line with Enter, which keeps, and with space, carrying the keys held', () => {
        expect(treeCommandOf(key('Enter'), LINES, 1)).toEqual({
            activation: {
                altKey: false,
                ctrlKey: false,
                keep: true,
                metaKey: false,
                shiftKey: false,
                space: false,
            },
            kind: 'press',
        });
        expect(treeCommandOf(key(' ', { ctrlKey: true }), LINES, 1)).toEqual({
            activation: {
                altKey: false,
                ctrlKey: true,
                keep: false,
                metaKey: false,
                shiftKey: false,
                space: true,
            },
            kind: 'press',
        });
    });

    it('deletes with Delete, and with Cmd+Backspace the way a Mac does', () => {
        expect(treeCommandOf(key('Delete'), LINES, 1)).toEqual({ kind: 'delete' });
        expect(treeCommandOf(key('Backspace', { metaKey: true }), LINES, 1)).toEqual({
            kind: 'delete',
        });
        expect(treeCommandOf(key('Backspace'), LINES, 1)).toBeNull();
    });

    it('takes every line with Ctrl+A or Cmd+A, and lets go of them with Escape', () => {
        expect(treeCommandOf(key('a', { ctrlKey: true }), LINES, 1)).toEqual({ kind: 'all' });
        expect(treeCommandOf(key('a', { metaKey: true }), LINES, 1)).toEqual({ kind: 'all' });
        expect(treeCommandOf(key('a'), LINES, 1)).toBeNull();
        expect(treeCommandOf(key('Escape'), LINES, 1)).toEqual({ kind: 'clear' });
    });

    /** Alt belongs to whoever moves nodes around with it; the tree takes none of those keys. */
    it('leaves every key held with Alt to someone else', () => {
        expect(treeCommandOf(key('ArrowDown', { altKey: true }), LINES, 0)).toBeNull();
        expect(treeCommandOf(key('Delete', { altKey: true }), LINES, 0)).toBeNull();
    });
});
