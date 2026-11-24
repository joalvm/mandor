import { describe, expect, it } from 'vitest';

import {
    arrowPixels,
    arrowStep,
    clampedSplit,
    dividerOrientation,
    keyboardDelta,
    SPLIT_AXES,
    stepOf,
} from '../../../src/components/split/split-axis.js';

const FULL_PANE = { width: 200, height: 100 } as DOMRect;

function pointerAt(clientX: number, clientY: number) {
    return { clientX, clientY };
}

/** A key on a divider, in a split as wide as the rect, or in none. */
function keyWith(
    shiftKey: boolean,
    parentRect: DOMRect | undefined,
): Parameters<typeof keyboardDelta>[0] {
    return {
        currentTarget: {
            parentElement:
                parentRect === undefined ? null : { getBoundingClientRect: () => parentRect },
        },
        shiftKey,
    };
}

describe('the axes of a split', () => {
    it('reads a row along the width, from the left edge', () => {
        const axis = SPLIT_AXES.row;
        const bounds = { height: 100, left: 10, top: 20, width: 200 } as DOMRect;

        expect(axis.orientation).toBe('vertical');
        expect(axis.pointOf(pointerAt(5, 7))).toBe(5);
        expect(axis.startOf(bounds)).toBe(10);
        expect(axis.sizeOf(bounds)).toBe(200);
    });

    it('reads a column along the height, from the top edge', () => {
        const axis = SPLIT_AXES.column;
        const bounds = { height: 100, left: 10, top: 20, width: 200 } as DOMRect;

        expect(axis.orientation).toBe('horizontal');
        expect(axis.pointOf(pointerAt(5, 7))).toBe(7);
        expect(axis.startOf(bounds)).toBe(20);
        expect(axis.sizeOf(bounds)).toBe(100);
    });

    it('steps each axis towards its own pair of arrows', () => {
        expect(stepOf('ArrowRight', SPLIT_AXES.row)).toBe(1);
        expect(stepOf('ArrowLeft', SPLIT_AXES.row)).toBe(-1);
        expect(stepOf('ArrowUp', SPLIT_AXES.row)).toBe(0);

        expect(stepOf('ArrowDown', SPLIT_AXES.column)).toBe(1);
        expect(stepOf('ArrowUp', SPLIT_AXES.column)).toBe(-1);
        expect(stepOf('ArrowRight', SPLIT_AXES.column)).toBe(0);
    });

    it('names the arrows of each direction for a divider the split does not own', () => {
        expect(['ArrowLeft', 'ArrowRight', 'ArrowUp'].map((key) => arrowStep(key, 'row'))).toEqual([
            -1, 1, 0,
        ]);
        expect(
            ['ArrowUp', 'ArrowDown', 'ArrowLeft'].map((key) => arrowStep(key, 'column')),
        ).toEqual([-1, 1, 0]);
    });

    it('moves any divider eight pixels a key, and thirty-two with shift', () => {
        expect(arrowPixels({ shiftKey: false })).toBe(8);
        expect(arrowPixels({ shiftKey: true })).toBe(32);
    });

    it('stands the divider of a row upright and lays the one of a column flat', () => {
        expect(dividerOrientation('row')).toBe('vertical');
        expect(dividerOrientation('column')).toBe('horizontal');
    });

    it('keeps the share inside the range the caller set', () => {
        expect(clampedSplit(40, 30, 70)).toBe(40);
        expect(clampedSplit(10, 30, 70)).toBe(30);
        expect(clampedSplit(90, 30, 70)).toBe(70);
    });

    /**
     * The step is a share of the pane, not a fixed pixel count, so the same keypress moves the
     * line the same fraction of a small pane and of a wide one.
     */
    it('moves a fixed fraction of the pane, eight pixels wide or thirty-two with shift', () => {
        expect(keyboardDelta(keyWith(false, FULL_PANE), SPLIT_AXES.row)).toBeCloseTo(4);
        expect(keyboardDelta(keyWith(true, FULL_PANE), SPLIT_AXES.row)).toBeCloseTo(16);
    });

    it('falls back to one step of the share when nothing has been laid out yet', () => {
        expect(keyboardDelta(keyWith(false, undefined), SPLIT_AXES.row)).toBe(1);
        expect(
            keyboardDelta(keyWith(true, { width: 0, height: 0 } as DOMRect), SPLIT_AXES.row),
        ).toBe(1);
    });
});
