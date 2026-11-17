import { caretOffsetIn, holdText, placeCaretAt, restoreHeldText } from '@mandor/ui';
import type { KeyboardEvent } from 'react';

/** The editable line a cell holds; every cell of this table edits in place. */
function editableOf(cell: HTMLElement | null | undefined): HTMLElement | null {
    return cell?.querySelector<HTMLElement>('[data-part="editable"]') ?? null;
}

/** The focusable line of the cell the walk lands on, with the caret at its end. */
export function focusCellOf(cell: HTMLElement | null | undefined): void {
    const editable = editableOf(cell);

    if (editable === null) {
        return;
    }

    editable.focus();
    placeCaretAt(editable, editable.textContent.length);
}

/** How far into its line the caret of a cell stands; a cell without a line stands at zero. */
function caretOffsetOf(cell: HTMLElement): number {
    const editable = editableOf(cell);

    if (editable === null) {
        return 0;
    }

    return caretOffsetIn(editable) ?? 0;
}

/**
 * Asks the table for the pair at an index that is not drawn, to focus that column of it once it
 * is; false when no pair stands there.
 */
export type ReachLine = (index: number, column: string) => boolean;

function NO_REACH(): boolean {
    return false;
}

type Walk = {
    cell: HTMLElement;
    column: string;
    event: KeyboardEvent<HTMLElement>;
    reach: ReachLine;
};

/** The row beside in the DOM: the empty last row, which has no index, is reached this way. */
function walkSiblings(row: HTMLElement, strip: HTMLElement, column: string, step: number): void {
    const rows = Array.from(strip.querySelectorAll<HTMLElement>('[data-kv-row]'));
    const next = rows[rows.indexOf(row) + step];

    if (next !== undefined) {
        focusCellOf(next.querySelector<HTMLElement>(`[data-kv-cell="${column}"]`));
    }
}

/**
 * Up and down: the same column of the pair beside, the empty last row included. A long table
 * draws only part of its pairs, so the one beside is found by its index, and asked for when the
 * window left it out: the next one drawn may be a screenful away.
 */
function walkRows({ cell, column, reach }: Walk, step: number): void {
    const row = cell.closest<HTMLElement>('[data-kv-row]');
    const strip = row?.parentElement ?? null;

    if (row === null || strip === null) {
        return;
    }

    const index = row.dataset['index'];
    const target = Number(index) + step;
    const next = strip.querySelector<HTMLElement>(`[data-kv-row][data-index="${String(target)}"]`);

    if (next !== null) {
        focusCellOf(next.querySelector<HTMLElement>(`[data-kv-cell="${column}"]`));

        return;
    }

    if (index !== undefined && reach(target, column)) {
        return;
    }

    walkSiblings(row, strip, column, step);
}

/** Left and right: the cell beside, only from the edge of the text. */
function walkColumns(cell: HTMLElement, step: number): void {
    const row = cell.closest<HTMLElement>('[data-kv-row]');

    if (row === null) {
        return;
    }

    const end = editableOf(cell)?.textContent.length ?? 0;
    const at = caretOffsetOf(cell);
    const atEdge = step < 0 ? at <= 0 : at >= end;

    if (!atEdge) {
        return;
    }

    const cells = Array.from(row.querySelectorAll<HTMLElement>('[data-kv-cell]'));
    const next = cells[cells.indexOf(cell) + step];

    if (next !== undefined) {
        focusCellOf(next);
    }
}

/** Across the rows the browser would scroll the page, so the walk keeps the key. */
function rowsBy(step: number): (walk: Walk) => void {
    return (walk) => {
        walk.event.preventDefault();
        walkRows(walk, step);
    };
}

/** Across the columns the caret moves inside the text until the edge, so the key stays the line's. */
function columnsBy(step: number): (walk: Walk) => void {
    return ({ cell }) => {
        walkColumns(cell, step);
    };
}

/** The columns of a row a line can be written in, in the order the grid lays them out. */
function writableColumns(row: HTMLElement | null): string[] {
    const cells = Array.from(row?.querySelectorAll<HTMLElement>('[data-kv-cell]') ?? []);

    return cells.flatMap((each) =>
        editableOf(each) === null ? [] : [each.dataset['kvCell'] ?? ''],
    );
}

/** The cell the tabulator lands on: the one after, or the one before with Shift. */
function tab({ cell, event, reach }: Walk): void {
    const step = event.shiftKey ? -1 : 1;
    const strip = cell.closest<HTMLElement>('[data-part="key-value-rows"]');
    const cells = Array.from(
        strip?.querySelectorAll<HTMLElement>('[data-kv-row] [data-kv-cell]') ?? [],
    ).filter((each) => editableOf(each) !== null);
    const next = cells[cells.indexOf(cell) + step];

    if (next !== undefined) {
        event.preventDefault();
        focusCellOf(next);

        return;
    }

    const row = cell.closest<HTMLElement>('[data-kv-row]');
    const index = row?.dataset['index'];
    const column = writableColumns(row).at(event.shiftKey ? -1 : 0);

    // Past the last pair drawn there may be more; past the last one there is, the key is the
    // window's, and the focus leaves the table.
    if (index !== undefined && column !== undefined && reach(Number(index) + step, column)) {
        event.preventDefault();
    }
}

/** What the reader wrote since starting on the line goes, and the line stays. */
function escape({ event }: Walk): void {
    if (restoreHeldText(event.currentTarget)) {
        event.preventDefault();
    }
}

/** What each key of the walk does; any other key belongs to the line. */
const WALKS: ReadonlyMap<string, (walk: Walk) => void> = new Map([
    ['Tab', tab],
    ['Escape', escape],
    ['ArrowDown', rowsBy(1)],
    ['ArrowUp', rowsBy(-1)],
    ['ArrowLeft', columnsBy(-1)],
    ['ArrowRight', columnsBy(1)],
]);

/**
 * Walks the grid: up and down move the caret to the same column of the row beside, and left
 * and right change column only from the edge of the text, where the caret has nowhere to go.
 * The tabulator takes the editable cells one after another, in the order the grid lays them
 * out, and at either end of the table it lets the focus leave. Without the Tab for ourselves the
 * browser would walk the tab stops inside the contenteditable first, and the caret would leave
 * the cell one press late. Escape gives back what the line had when the reader started on it.
 * Every editable of the table offers its keys after its own, so the walk hangs from there.
 */
export function walkGrid(event: KeyboardEvent<HTMLElement>, reach: ReachLine = NO_REACH): void {
    const cell = event.currentTarget.closest<HTMLElement>('[data-kv-cell]');
    const column = cell?.dataset['kvCell'];

    if (cell === null || column === undefined) {
        return;
    }

    holdText(event.currentTarget);
    WALKS.get(event.key)?.({ cell, column, event, reach });
}
