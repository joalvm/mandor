import type { KeyboardEvent, PointerEvent } from 'react';

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
 */
export function arrowStep(key: string, direction: SplitDirection): number {
    return stepOf(key, SPLIT_AXES[direction]);
}

/** How far one arrow key moves any divider, in pixels: the same reach in every one of them. */
export function arrowPixels(key: { shiftKey: boolean }): number {
    return key.shiftKey ? LARGE_ARROW_PIXELS : ARROW_PIXELS;
}

/** How a divider reads to assistive tech: the one of a row stands upright, of a column lies flat. */
export function dividerOrientation(direction: SplitDirection): SplitAxis['orientation'] {
    return SPLIT_AXES[direction].orientation;
}
