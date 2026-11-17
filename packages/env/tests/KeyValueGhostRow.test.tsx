import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KeyValueGhostRow } from '../src/components/key-value/KeyValueGhostRow.js';
import { BOTH, mountRowsInTable } from './support/key-value-state.js';

afterEach(cleanup);

/** Text under the focus, the way the field receives an edit. */
function write(cell: HTMLElement, text: string): void {
    fireEvent.focus(cell);
    cell.textContent = text;
    fireEvent.input(cell);
}

describe('the empty row at the end of the table', () => {
    it('holds no line and no door: it is only a place to write', () => {
        const { container } = mountRowsInTable(<KeyValueGhostRow />);

        expect(container.querySelector('[data-ghost="true"]')).not.toBeNull();
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('brings a line to life from the key, under the next identity', () => {
        const { onLines } = mountRowsInTable(<KeyValueGhostRow />);

        write(screen.getByRole('textbox', { name: 'Clave' }), 'nuevo');

        expect(onLines).toHaveBeenCalledWith([
            expect.objectContaining({ id: '0' }),
            expect.objectContaining({ id: '1' }),
            expect.objectContaining({ id: '2' }),
            { disabled: false, id: '3', name: 'nuevo', value: '' },
        ]);
    });

    it('brings a line to life from the value, with the key still empty', () => {
        const { onLines } = mountRowsInTable(<KeyValueGhostRow />);

        write(screen.getByRole('textbox', { name: 'Valor' }), 'x');

        expect(onLines.mock.lastCall?.[0].at(-1)).toEqual({
            disabled: false,
            id: '3',
            name: '',
            value: 'x',
        });
    });

    it('brings a line to life from the description when that column is on', () => {
        const { onLines } = mountRowsInTable(<KeyValueGhostRow />, { columns: BOTH });

        write(screen.getByRole('textbox', { name: 'Descripción' }), 'nota');

        expect(onLines.mock.lastCall?.[0].at(-1)).toMatchObject({ description: 'nota' });
    });

    it('ignores a blank text: nobody wrote anything', () => {
        const { onLines } = mountRowsInTable(<KeyValueGhostRow />);

        write(screen.getByRole('textbox', { name: 'Clave' }), '   ');

        expect(onLines).not.toHaveBeenCalled();
    });

    it('delivers what it was handed once per visit, and again once it is written into anew', () => {
        const { onLines } = mountRowsInTable(<KeyValueGhostRow />);
        const key = screen.getByRole('textbox', { name: 'Clave' });

        write(key, 'a');
        fireEvent.input(key);
        expect(onLines).toHaveBeenCalledTimes(1);

        write(key, 'b');
        expect(onLines).toHaveBeenCalledTimes(2);
    });

    it('speaks plain text in the value when the table speaks no variables', () => {
        const { onLines } = mountRowsInTable(<KeyValueGhostRow />, { variables: false });
        const value = screen.getByRole('textbox', { name: 'Valor' });

        write(value, 'literal');

        expect(onLines.mock.lastCall?.[0].at(-1)).toMatchObject({ value: 'literal' });
    });

    it('draws no value cell when that column is off', () => {
        mountRowsInTable(<KeyValueGhostRow />, { columns: { description: false, value: false } });

        expect(screen.queryByRole('textbox', { name: 'Valor' })).toBeNull();
        expect(screen.getByRole('textbox', { name: 'Clave' })).toBeVisible();
    });
});
