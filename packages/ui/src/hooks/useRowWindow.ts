import {
    defaultRangeExtractor,
    observeElementRect,
    useVirtualizer,
    type Range,
    type Rect,
    type Virtualizer,
} from '@tanstack/react-virtual';
import { scaleTokenValues } from '../styles/token-scale-values.js';

/** A row is one row of the scale tall; the window measures the whole list from that. */
const ROW_HEIGHT = Number.parseFloat(scaleTokenValues['mandor-height-row']);
const OVERSCAN = 8;

/**
 * What a scroller that measures nothing is worth. A height of zero leaves the window with no
 * range and the list empty, and that is the state of a panel before layout runs and of every
 * list under a test. A screenful is drawn until the real height arrives.
 */
const UNMEASURED_HEIGHT = ROW_HEIGHT * 20;

/**
 * A row in the DOM: which one, the key it is drawn under, how far from the top it stands and
 * how tall it is.
 */
type DrawnRow = { index: number; key: string; size: number; start: number };

/** The part of a long list that is in the DOM, and how tall the whole of it is. */
export type RowWindow = {
    drawn: DrawnRow[];
    /**
     * Measures a drawn row whose height is its own, not the one of the scale; the row carries
     * its index as `data-index`. A list of lines of the scale needs none of it.
     */
    measure: (node: Element | null) => void;
    scrollTo: (index: number) => void;
    total: number;
};

type RowWindowOptions = {
    count: number;
    /**
     * Opens on the last row and keeps to it while the reader stays there, as a console does: the
     * rows that arrive and the ones measured taller than counted. Off, the list reads from the top.
     */
    followsEnd?: boolean | undefined;
    /** The rows that stay drawn out of sight: the one that holds the focus, and the like. */
    kept?: readonly number[] | undefined;
    keyOf: (index: number) => number | string;
    /** How tall a row stands before it is measured, when it is not a line of the scale. */
    rowHeight?: number | undefined;
    /** The box that scrolls the list, asked once it is laid out. */
    scroller: () => HTMLElement | null;
    /** How far into the scroller the list starts, when something scrolls above it. */
    scrollMargin?: number | undefined;
};

function observeScroller(
    instance: Virtualizer<HTMLElement, Element>,
    onRect: (rect: Rect) => void,
): ReturnType<typeof observeElementRect> {
    return observeElementRect(instance, (rect) => {
        onRect(rect.height === 0 ? { height: UNMEASURED_HEIGHT, width: rect.width } : rect);
    });
}

/** A row nothing laid out yet is worth what one never measured is. */
function measuredOr(rowHeight: number): (element: Element) => number {
    return (element) => element.getBoundingClientRect().height || rowHeight;
}

/** The rows on screen, and the kept ones wherever they scrolled to. */
function rangeKeeping(kept: readonly number[]): (range: Range) => number[] {
    return (range) => {
        const indexes = new Set(defaultRangeExtractor(range));

        for (const index of kept) {
            if (index >= 0 && index < range.count) {
                indexes.add(index);
            }
        }

        return [...indexes].sort((one, other) => one - other);
    };
}

/**
 * Only the rows on screen enter the DOM, so a list of a thousand rows costs what one of ten
 * does. The rest are the height they would take, and the scrollbar reads the whole list. Every
 * row is one row of the scale tall, or one of a table: the lists of the window are lines, not
 * cards. A row counted shorter than it stands grows the list each time it is first drawn, and
 * moves the scroll under whoever is reading it.
 *
 * The row that holds the focus stays drawn when it scrolls out of sight. Taking it out of the
 * DOM would throw the focus to the page, and the next arrow would reach nothing.
 */
export function useRowWindow({
    count,
    followsEnd = false,
    kept = [],
    keyOf,
    rowHeight = ROW_HEIGHT,
    scroller,
    scrollMargin = 0,
}: RowWindowOptions): RowWindow {
    const virtualizer = useVirtualizer({
        count,
        estimateSize: () => rowHeight,
        getItemKey: keyOf,
        getScrollElement: scroller,
        measureElement: measuredOr(rowHeight),
        observeElementRect: observeScroller,
        overscan: OVERSCAN,
        anchorTo: followsEnd ? 'end' : 'start',
        followOnAppend: followsEnd,
        // The estimate of the whole list is past its end, and the scroller stops at the end.
        initialOffset: followsEnd ? () => count * rowHeight : 0,
        rangeExtractor: rangeKeeping(kept),
        scrollMargin,
    });

    return {
        drawn: virtualizer
            .getVirtualItems()
            .map(({ index, key, size, start }) => ({ index, key: String(key), size, start })),
        measure: virtualizer.measureElement,
        scrollTo: (index) => {
            virtualizer.scrollToIndex(index);
        },
        total: virtualizer.getTotalSize(),
    };
}
