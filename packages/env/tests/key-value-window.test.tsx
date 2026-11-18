import { TABLE_ROW_HEIGHT } from '@mandor/ui';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { editableOf, mount, mountIn } from './support/key-value.js';

/** Far enough down a table of five hundred to leave its first hundred pairs behind. */
const DOWN = 5000;

const LONG = Array.from({ length: 500 }, (_, index) => ({
    disabled: false,
    id: String(index),
    name: `name${String(index)}`,
    value: `value ${String(index)}`,
}));

function drawn(container: HTMLElement): string[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>('[data-part="key-value-row"]:not([data-ghost])'),
        (row) => row.dataset['kvRow'] ?? '',
    );
}

function scroller(): HTMLElement {
    const box = document.body.appendChild(document.createElement('div'));

    box.style.overflowY = 'auto';

    return box;
}

/** jsdom lays nothing out, so the scroll is written where the window reads it. */
function scrolledDown(box: HTMLElement): void {
    box.scrollTop = DOWN;
    fireEvent.scroll(box);
}

function gapsOf(container: HTMLElement): number[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>('[data-part="key-value-gap"]'),
        (gap) => Number.parseFloat(gap.dataset['size'] ?? '0'),
    );
}

/**
 * A table of thousands of variables drew every one of them: two seconds to open five hundred
 * under the test, and every keystroke drew them all again. Only what is on screen enters the DOM.
 */
describe('the window of a long table of pairs (KeyValueLines, useKeyValueWindow)', () => {
    it('draws a screenful of a long table, not every pair', () => {
        const rows = drawn(mount(undefined, { lines: LONG }));

        expect(rows.length).toBeLessThan(40);
        expect(rows).toContain('0');
    });

    /** The tabulator circles from the last pair to the first: both ends are always there. */
    it('keeps the last pair drawn, where the tabulator lands from the first', () => {
        expect(drawn(mount(undefined, { lines: LONG }))).toContain('499');
    });

    it('draws the pairs a scroll brings into view', () => {
        const box = scroller();
        const container = mountIn(box, { lines: LONG });

        scrolledDown(box);

        const rows = drawn(container).map(Number);

        expect(rows.some((row) => row > 150 && row < 499)).toBe(true);
        expect(rows).not.toContain(100);
    });

    /** Taking the row that holds the caret out of the DOM would throw the focus to the page. */
    it('keeps the pair being written drawn when a scroll takes it out of sight', () => {
        const box = scroller();
        const container = mountIn(box, { lines: LONG });
        const key = editableOf(container, '5', 'key');

        act(() => {
            key?.focus();
        });
        scrolledDown(box);

        expect(drawn(container)).toContain('5');
        expect(editableOf(container, '5', 'key')).toHaveFocus();
    });

    /** The pair beside may be left out; the arrow still reaches it, not the next one drawn. */
    it('walks up from the last pair to the one before it, not to the window', async () => {
        const container = mount(undefined, { lines: LONG });
        const last = editableOf(container, '499', 'key');

        act(() => {
            last?.focus();
        });
        fireEvent.keyDown(last ?? document.body, { key: 'ArrowUp' });

        await waitFor(() => {
            expect(editableOf(container, '498', 'key')).toHaveFocus();
        });
    });

    it('walks down from a pair a scroll took out of sight to the one after it', async () => {
        const box = scroller();
        const container = mountIn(box, { lines: LONG });
        const key = editableOf(container, '5', 'value');

        act(() => {
            key?.focus();
        });
        scrolledDown(box);
        fireEvent.keyDown(editableOf(container, '5', 'value') ?? document.body, {
            key: 'ArrowDown',
        });

        await waitFor(() => {
            expect(editableOf(container, '6', 'value')).toHaveFocus();
        });
    });

    it('stands the drawn pairs where they stand in the whole table', () => {
        const box = scroller();
        const container = mountIn(box, { lines: LONG });

        scrolledDown(box);

        const rows = drawn(container).map(Number);
        const gaps = gapsOf(container);
        // The first gap stands for the pairs between the first one and the window.
        const row = (gaps[0] ?? 0) / ((rows[1] ?? 0) - 1);
        const total = gaps.reduce((sum, gap) => sum + gap, 0) + rows.length * row;

        expect(row).toBeGreaterThan(0);
        expect(total).toBeCloseTo(LONG.length * row);
    });

    /**
     * A pair left out counts as tall as a row of the table stands. Counted at a line of the
     * scale, three thousand headers came out a fifth short, every pair drawn for the first time
     * grew the table, and the arrow from the last pair scrolled to where the one before it no
     * longer stood.
     */
    it('counts each pair left out as tall as a row of the table', () => {
        const container = mount(undefined, { lines: LONG });
        const rows = drawn(container).map(Number);
        const gaps = gapsOf(container);
        const beforeLast = rows.at(-2) ?? 0;

        expect(gaps.at(-2)).toBe((LONG.length - 1 - beforeLast - 1) * TABLE_ROW_HEIGHT);
    });
});
