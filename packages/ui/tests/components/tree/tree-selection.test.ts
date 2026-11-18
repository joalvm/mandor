import { describe, expect, it } from 'vitest';

import type { RowModifiers } from '../../../src/components/row/row-activation.js';
import type { TreeLine } from '../../../src/components/tree/tree-line.js';
import { actedOn, pressedSelection } from '../../../src/components/tree/tree-selection.js';

const LINES: readonly TreeLine[] = [
    { expanded: true, id: 'orders', level: 1 },
    { id: 'orders/created', level: 2 },
    { id: 'orders/paid', level: 2 },
    { id: 'readme', level: 1 },
];

const PLAIN: RowModifiers = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };
const CTRL: RowModifiers = { ...PLAIN, ctrlKey: true };
const META: RowModifiers = { ...PLAIN, metaKey: true };
const SHIFT: RowModifiers = { ...PLAIN, shiftKey: true };

describe('pressing a line of a tree', () => {
    it('takes only the pressed line and anchors the next range there', () => {
        expect(
            pressedSelection(LINES, { anchor: 'orders', selected: ['orders'] }, 'readme', PLAIN),
        ).toEqual({ anchor: 'readme', selected: ['readme'] });
    });

    it('adds a line with Ctrl and takes it out again with the next Ctrl', () => {
        const added = pressedSelection(
            LINES,
            { anchor: 'orders', selected: ['orders'] },
            'readme',
            CTRL,
        );

        expect(added).toEqual({ anchor: 'readme', selected: ['orders', 'readme'] });
        expect(pressedSelection(LINES, added, 'orders', CTRL)).toEqual({
            anchor: 'orders',
            selected: ['readme'],
        });
    });

    it('answers to Cmd the way it answers to Ctrl', () => {
        expect(
            pressedSelection(LINES, { anchor: null, selected: ['orders'] }, 'readme', META),
        ).toEqual({ anchor: 'readme', selected: ['orders', 'readme'] });
    });

    it('takes the range from the anchor with Shift, in the order the lines stand', () => {
        const range = pressedSelection(
            LINES,
            { anchor: 'readme', selected: ['readme'] },
            'orders/created',
            SHIFT,
        );

        expect(range).toEqual({
            anchor: 'readme',
            selected: ['orders/created', 'orders/paid', 'readme'],
        });
        expect(pressedSelection(LINES, range, 'orders/paid', SHIFT)).toEqual({
            anchor: 'readme',
            selected: ['orders/paid', 'readme'],
        });
    });

    /** An anchor that folded out of sight, or that was never set, starts the range where it lands. */
    it('starts the range on the pressed line when the anchor is not in sight', () => {
        expect(
            pressedSelection(LINES, { anchor: null, selected: [] }, 'orders/paid', SHIFT),
        ).toEqual({
            anchor: 'orders/paid',
            selected: ['orders/paid'],
        });
        expect(
            pressedSelection(LINES, { anchor: 'gone', selected: ['gone'] }, 'readme', SHIFT),
        ).toEqual({ anchor: 'readme', selected: ['readme'] });
    });
});

describe('what a gesture acts on', () => {
    it('acts on the whole selection when the focused line is part of it, in line order', () => {
        expect(actedOn(LINES, ['readme', 'orders/created'], 'readme')).toEqual([
            'orders/created',
            'readme',
        ]);
    });

    it('acts on the focused line alone when it stands outside the selection', () => {
        expect(actedOn(LINES, ['readme', 'orders/created'], 'orders')).toEqual(['orders']);
    });

    it('leaves out selected lines that are no longer in the tree', () => {
        expect(actedOn(LINES, ['readme', 'gone'], 'readme')).toEqual(['readme']);
    });
});
