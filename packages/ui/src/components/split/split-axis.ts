import type { KeyboardEvent, PointerEvent } from 'react';

import type { WritingDirection } from '../../hooks/useWritingDirection.js';

/** Which way the second half sits: beside the first, or under it. */
export type SplitDirection = 'column' | 'row';

/** What a divider reads of the pointer: where it is on the screen. */
type PointerSpot = Pick<PointerEvent<HTMLElement>, 'clientX' | 'clientY'>;

/** What a divider reads of a key: whether Shift is held, and the split it sits in. */
type DividerKey = Pick<KeyboardEvent<HTMLElement>, 'shiftKey'> & {
    currentTarget: { parentElement: Pick<HTMLElement, 'getBoundingClientRect'> | null };
};

export type SplitAxis = {
    back: string;
    forward: string;
    /** The divider runs across the axis it moves along, so the two swap names. */
    handle: string;
    orientation: 'horizontal' | 'vertical';
    pointOf: (event: PointerSpot) => number;
    startOf: (bounds: DOMRect) => number;
    sizeOf: (bounds: DOMRect) => number;
};

/** How far one arrow key moves a divider, in pixels, and how far it moves with Shift held. */
const ARROW_PIXELS = 8;

const LARGE_ARROW_PIXELS = 32;

export const SPLIT_AXES: Record<SplitDirection, SplitAxis> = {
    column: {
        back: 'ArrowUp',
        forward: 'ArrowDown',
        handle: 'border-y before:inset-x-0 before:top-1/2 before:-translate-y-1/2',
        orientation: 'horizontal',
        pointOf: (event) => event.clientY,
        startOf: (bounds) => bounds.top,
        sizeOf: (bounds) => bounds.height,
    },
    row: {
        back: 'ArrowLeft',
        forward: 'ArrowRight',
        handle: 'border-x before:inset-y-0 before:left-1/2 before:-translate-x-1/2',
        orientation: 'vertical',
        pointOf: (event) => event.clientX,
        startOf: (bounds) => bounds.left,
        sizeOf: (bounds) => bounds.width,
    },
};

/**
 * A row read from the right, the way a window written from the right lays it out: its first half
 * stands at the right edge and the arrow that points away from it, the left one, moves it forward.
 * The pointer is measured backwards, so the distance from the start still grows as it moves on.
 */
const ROW_FROM_THE_RIGHT: SplitAxis = {
    ...SPLIT_AXES.row,
    back: 'ArrowRight',
    forward: 'ArrowLeft',
    pointOf: (event) => -event.clientX,
    startOf: (bounds) => -bounds.right,
};

const AXES_BY_WRITING: Record<WritingDirection, Record<SplitDirection, SplitAxis>> = {
    ltr: SPLIT_AXES,
    rtl: { column: SPLIT_AXES.column, row: ROW_FROM_THE_RIGHT },
};

/** The axis of a split in a window that reads one way or the other: only a row turns round. */
export function splitAxisOf(direction: SplitDirection, writing: WritingDirection): SplitAxis {
    return AXES_BY_WRITING[writing][direction];
}

/** How far into its box the pointer stands, counted from the edge the box starts at. */
export function reachInto(event: PointerSpot, bounds: DOMRect, axis: SplitAxis): number {
    return axis.pointOf(event) - axis.startOf(bounds);
}

export function clampedSplit(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function keyboardDelta(event: DividerKey, axis: SplitAxis): number {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    const size = bounds === undefined ? 0 : axis.sizeOf(bounds);
    const pixels = arrowPixels(event);

    return size > 0 ? (pixels / size) * 100 : 1;
}

export function stepOf(key: string, axis: SplitAxis): number {
    if (key === axis.back) {
        return -1;
    }

    return key === axis.forward ? 1 : 0;
}

/**
 * Which way an arrow key moves a divider the split does not own —a seam of the stack, the edge
 * of the sidebar, a separator of the grid— so every divider of the window answers the same keys.
 * The grid lays its panels out from the left in every language, so its separators keep the
 * arrows of a window read from the left.
 */
export function arrowStep(
    key: string,
    direction: SplitDirection,
    writing: WritingDirection = 'ltr',
): number {
    return stepOf(key, splitAxisOf(direction, writing));
}

/** How far one arrow key moves any divider, in pixels: the same reach in every one of them. */
export function arrowPixels(key: { shiftKey: boolean }): number {
    return key.shiftKey ? LARGE_ARROW_PIXELS : ARROW_PIXELS;
}

/** How a divider reads to assistive tech: the one of a row stands upright, of a column lies flat. */
export function dividerOrientation(direction: SplitDirection): SplitAxis['orientation'] {
    return SPLIT_AXES[direction].orientation;
}
