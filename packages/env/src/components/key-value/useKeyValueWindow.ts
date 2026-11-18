import { TABLE_ROW_HEIGHT, useRowWindow, type RowWindow } from '@mandor/ui';
import { type RefObject, useEffect, useState } from 'react';

import type { KeyValueLine } from './key-value-line.js';

/** A pair in the DOM, and the height of the pairs left out between it and the one before. */
type DrawnLine = { gap: number; index: number; key: string; line: KeyValueLine };

/** The pairs of a long table that are in the DOM, and how tall the ones after the last are. */
export type KeyValueWindow = {
    lines: DrawnLine[];
    measure: RowWindow['measure'];
    tail: number;
};

type KeyValueWindowOptions = {
    /**
     * The row of the height after the last pair, always drawn: the window finds its scroller
     * from it, since the strip of rows is not yet attached when the window first lays out.
     */
    anchor: RefObject<HTMLTableRowElement | null>;
    /** The pair the handle carries, which stays drawn while it travels. */
    dragId: string | undefined;
    lines: readonly KeyValueLine[];
    /** The pair an arrow walked to, drawn so the walk can land on it. */
    reachedId: string | undefined;
    rowsRef: RefObject<HTMLTableSectionElement | null>;
};

const SCROLLING = new Set(['auto', 'overlay', 'scroll']);

/**
 * Whether a box is the one that scrolls the table. The table itself may scroll, but only where
 * its host bounds its height: elsewhere it grows with what it holds, and the box that scrolls
 * is further out. A box with no height laid out yet is taken at its word.
 */
function scrolls(box: HTMLElement): boolean {
    if (!SCROLLING.has(getComputedStyle(box).overflowY)) {
        return false;
    }

    return box.clientHeight === 0 || box.scrollHeight > box.clientHeight;
}

/**
 * The box that scrolls the table: each place that hosts one has its own, a dialog or a pane.
 * Without one, the page itself, where nothing scrolls and a screenful is drawn.
 */
function scrollerOf(row: HTMLElement | null): HTMLElement | null {
    let box = row?.parentElement ?? null;

    while (box !== null && !scrolls(box)) {
        box = box.parentElement;
    }

    if (box !== null) {
        return box;
    }

    return row?.ownerDocument.documentElement ?? null;
}

/** How far into its scroller the first pair stands: the head and the rows the app adds. */
function marginOf(rows: HTMLElement): number {
    const first = rows.querySelector('[data-part="key-value-row"][data-index="0"]');
    const scroller = scrollerOf(rows);

    if (first === null || scroller === null) {
        return 0;
    }

    const top = first.getBoundingClientRect().top - scroller.getBoundingClientRect().top;

    return top + scroller.scrollTop;
}

function useLinesMargin(rowsRef: RefObject<HTMLTableSectionElement | null>): number {
    const [margin, setMargin] = useState(0);

    useEffect(() => {
        const rows = rowsRef.current;

        if (rows === null) {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            setMargin(marginOf(rows));
        });

        observer.observe(rows);

        return () => {
            observer.disconnect();
        };
    }, [rowsRef]);

    return margin;
}

/**
 * The pair whose cell holds the focus. Read as the window is drawn, since only a new drawing
 * moves the window: the row stays drawn for as long as the focus is in it.
 */
function focusedLine(): string | undefined {
    const row = document.activeElement?.closest<HTMLElement>('[data-kv-row]');

    return row?.dataset['kvRow'];
}

/** Each drawn pair after the height of the ones left out before it, from the first pair on. */
function laidOut(
    view: Pick<RowWindow, 'drawn' | 'total'>,
    lines: readonly KeyValueLine[],
    margin: number,
): Pick<KeyValueWindow, 'lines' | 'tail'> {
    const drawn: DrawnLine[] = [];
    let end = margin;

    for (const row of view.drawn) {
        const line = lines[row.index];

        if (line !== undefined) {
            drawn.push({ gap: row.start - end, index: row.index, key: row.key, line });
            end = row.start + row.size;
        }
    }

    return { lines: drawn, tail: margin + view.total - end };
}

function indexOf(lines: readonly KeyValueLine[], id: string | undefined): number {
    return lines.findIndex((line) => line.id === id);
}

/**
 * Only the pairs on screen enter the DOM, so a table of thousands of variables opens and
 * answers a keystroke as one of ten does, and holds the memory of ten. The ones left out are
 * the height they would take. Some stay drawn wherever the scroll is: the first and the last,
 * where the tabulator circles; the one being written, or the focus would fall to the page; the
 * one an arrow walks to; and the one the handle carries.
 */
export function useKeyValueWindow({
    anchor,
    dragId,
    lines,
    reachedId,
    rowsRef,
}: KeyValueWindowOptions): KeyValueWindow {
    const margin = useLinesMargin(rowsRef);
    const view = useRowWindow({
        count: lines.length,
        kept: [
            0,
            lines.length - 1,
            indexOf(lines, focusedLine()),
            indexOf(lines, dragId),
            indexOf(lines, reachedId),
        ],
        keyOf: (index) => lines[index]?.id ?? index,
        rowHeight: TABLE_ROW_HEIGHT,
        scroller: () => scrollerOf(anchor.current),
        scrollMargin: margin,
    });

    return { ...laidOut(view, lines, margin), measure: view.measure };
}
