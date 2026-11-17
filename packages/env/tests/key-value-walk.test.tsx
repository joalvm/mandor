import { placeCaretAt } from '@mandor/ui';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { focusCellOf, walkGrid } from '../src/components/key-value/key-value-walk.js';

afterEach(cleanup);

const ROWS = ['a', 'b', 'c'];

/** A grid of three rows; the third column of each row has no line to write in. */
function draw(): HTMLElement {
    const { container } = render(
        <div data-part="key-value-rows">
            {ROWS.map((row) => (
                <div data-kv-row={row} key={row}>
                    <div data-kv-cell="key">
                        <span data-part="editable" onKeyDown={walkGrid} tabIndex={0}>
                            {`${row}-key`}
                        </span>
                    </div>
                    <div data-kv-cell="value">
                        <span data-part="editable" onKeyDown={walkGrid} tabIndex={0}>
                            {`${row}-value`}
                        </span>
                    </div>
                    <div data-kv-cell="description" />
                </div>
            ))}
        </div>,
    );

    return container;
}

function cell(container: HTMLElement, row: string, column: string): HTMLElement {
    const found = container.querySelector<HTMLElement>(
        `[data-kv-row="${row}"] [data-kv-cell="${column}"] [data-part="editable"]`,
    );

    if (found === null) {
        throw new Error('la celda no esta');
    }

    return found;
}

describe('walking the grid', () => {
    it('lands on a cell with its caret at the end of the line', () => {
        const container = draw();
        const target = cell(container, 'a', 'value');

        focusCellOf(target.parentElement);

        expect(document.activeElement).toBe(target);
        expect(window.getSelection()?.focusOffset).toBe('a-value'.length);
    });

    it('does nothing for a cell without a line to write in', () => {
        const container = draw();
        const before = document.activeElement;

        focusCellOf(container.querySelector<HTMLElement>('[data-kv-cell="description"]'));
        focusCellOf(null);

        expect(document.activeElement).toBe(before);
    });

    it('moves down and up inside the same column', () => {
        const container = draw();

        fireEvent.keyDown(cell(container, 'a', 'value'), { key: 'ArrowDown' });
        expect(document.activeElement).toBe(cell(container, 'b', 'value'));

        fireEvent.keyDown(cell(container, 'b', 'value'), { key: 'ArrowUp' });
        expect(document.activeElement).toBe(cell(container, 'a', 'value'));
    });

    it('stays where it is when there is no row beyond', () => {
        const container = draw();
        const first = cell(container, 'a', 'key');

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowUp' });

        expect(document.activeElement).toBe(first);
    });

    it('changes column only from the edge of the text, where the caret has nowhere to go', () => {
        const container = draw();
        const key = cell(container, 'a', 'key');

        key.focus();
        placeCaretAt(key, 2);
        fireEvent.keyDown(key, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(key);

        placeCaretAt(key, key.textContent.length);
        fireEvent.keyDown(key, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(cell(container, 'a', 'value'));
    });

    it('goes back a column from the start of the text', () => {
        const container = draw();
        const value = cell(container, 'a', 'value');

        value.focus();
        placeCaretAt(value, 0);
        fireEvent.keyDown(value, { key: 'ArrowLeft' });

        expect(document.activeElement).toBe(cell(container, 'a', 'key'));
    });

    it('takes the tabulator for itself and walks the cells that hold a line', () => {
        const container = draw();

        expect(fireEvent.keyDown(cell(container, 'a', 'key'), { key: 'Tab' })).toBe(false);
        expect(document.activeElement).toBe(cell(container, 'a', 'value'));

        fireEvent.keyDown(cell(container, 'a', 'value'), { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(cell(container, 'a', 'key'));
    });

    it('lets the focus leave at either end of the table', () => {
        const container = draw();

        expect(fireEvent.keyDown(cell(container, 'c', 'value'), { key: 'Tab' })).toBe(true);
        expect(fireEvent.keyDown(cell(container, 'a', 'key'), { key: 'Tab', shiftKey: true })).toBe(
            true,
        );
    });

    it('asks for the pair past the last one drawn before letting the focus leave', () => {
        const reach = vi.fn((index: number) => index === 5);
        const { container } = render(
            <div data-part="key-value-rows">
                <div data-index="4" data-kv-row="e">
                    <div data-kv-cell="key">
                        <span
                            data-part="editable"
                            onKeyDown={(event) => {
                                walkGrid(event, reach);
                            }}
                            tabIndex={0}
                        />
                    </div>
                </div>
            </div>,
        );
        const only = cell(container, 'e', 'key');

        expect(fireEvent.keyDown(only, { key: 'Tab' })).toBe(false);
        expect(reach).toHaveBeenCalledWith(5, 'key');
        expect(fireEvent.keyDown(only, { key: 'Tab', shiftKey: true })).toBe(true);
    });

    it('gives back with Escape what the cell had when the reader started on it', () => {
        const container = draw();
        const line = cell(container, 'a', 'key');

        line.focus();
        fireEvent.keyDown(line, { key: 'x' });
        line.textContent = 'a-keyx';

        expect(fireEvent.keyDown(line, { key: 'Escape' })).toBe(false);
        expect(line.textContent).toBe('a-key');
        expect(fireEvent.keyDown(line, { key: 'Escape' })).toBe(true);
    });

    it('ignores the keys that are not for the walk', () => {
        const container = draw();
        const key = cell(container, 'a', 'key');

        key.focus();

        expect(fireEvent.keyDown(key, { key: 'a' })).toBe(true);
        expect(document.activeElement).toBe(key);
    });
});
