import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { KeyValueLine } from '../src/components/key-value/key-value-line.js';
import { KeyValueRow } from '../src/components/key-value/KeyValueRow.js';
import { BOTH, mountRowsInTable, VALUE_ONLY } from './support/key-value-state.js';

afterEach(cleanup);

/** A row outside a window has nothing to measure it for. */
function unmeasured(): void {
    return undefined;
}

const LINE: KeyValueLine = {
    description: 'Cuándo empieza',
    disabled: false,
    id: '0',
    name: 'start',
    value: '2024-07-16',
};

describe('one pair of the table', () => {
    it('speaks its key and its value, and wears nothing in the columns that are off', () => {
        mountRowsInTable(<KeyValueRow index={0} measure={unmeasured} line={LINE} />, {
            columns: VALUE_ONLY,
        });

        expect(screen.getByRole('textbox', { name: 'Clave' })).toHaveTextContent('start');
        expect(screen.getByRole('textbox', { name: 'Valor' })).toHaveTextContent('2024-07-16');
        expect(screen.queryByRole('textbox', { name: 'Descripción' })).toBeNull();
    });

    it('speaks its description when that column is on', () => {
        mountRowsInTable(<KeyValueRow index={0} measure={unmeasured} line={LINE} />, {
            columns: BOTH,
        });

        expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveTextContent(
            'Cuándo empieza',
        );
    });

    it('switches off with its checkbox without losing the pair', () => {
        const { onLines } = mountRowsInTable(
            <KeyValueRow index={0} measure={unmeasured} line={LINE} />,
            { lines: [LINE] },
        );

        fireEvent.click(screen.getByRole('checkbox', { name: 'Enviar esta entrada' }));

        expect(onLines).toHaveBeenCalledWith([{ ...LINE, disabled: true }]);
    });

    it('is told disabled when the pair does not go out', () => {
        const { container } = mountRowsInTable(
            <KeyValueRow index={0} measure={unmeasured} line={{ ...LINE, disabled: true }} />,
        );

        expect(container.querySelector('[data-kv-row="0"][data-disabled]')).not.toBeNull();
        expect(screen.getByRole('checkbox', { name: 'Enviar esta entrada' })).not.toBeChecked();
    });

    it('goes out of the table by its door', () => {
        const { onLines } = mountRowsInTable(
            <KeyValueRow index={0} measure={unmeasured} line={LINE} />,
            { lines: [LINE] },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Quitar entrada' }));

        expect(onLines).toHaveBeenCalledWith([]);
    });

    it('writes a new value into its own line', () => {
        const { onLines } = mountRowsInTable(
            <KeyValueRow index={0} measure={unmeasured} line={LINE} />,
            { lines: [LINE] },
        );
        const value = screen.getByRole('textbox', { name: 'Valor' });

        fireEvent.focus(value);
        value.textContent = '2025-01-01';
        fireEvent.input(value);

        expect(onLines).toHaveBeenCalledWith([{ ...LINE, value: '2025-01-01' }]);
    });

    it('wears the type of the pair as a badge beside the key', () => {
        mountRowsInTable(
            <KeyValueRow
                index={0}
                measure={unmeasured}
                line={{ ...LINE, meta: { type: 'integer' } }}
            />,
        );

        expect(screen.getByText('integer')).toBeVisible();
    });

    it('offers the mark of secret only in a table that carries secrets', () => {
        mountRowsInTable(<KeyValueRow index={0} measure={unmeasured} line={LINE} />);
        expect(screen.queryByRole('button', { name: 'Variable secreta' })).toBeNull();
    });

    it('marks the pair as secret from its own door, and takes the mark away', () => {
        const { onLines } = mountRowsInTable(
            <KeyValueRow index={0} measure={unmeasured} line={{ ...LINE, secret: true }} />,
            {
                lines: [{ ...LINE, secret: true }],
                secretable: true,
            },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Variable secreta' }));

        expect(onLines).toHaveBeenCalledWith([{ ...LINE, secret: false }]);
    });

    it('offers the type panel only in a table that carries types', () => {
        mountRowsInTable(<KeyValueRow index={0} measure={unmeasured} line={LINE} />, {
            typed: false,
        });
        expect(screen.queryByRole('button', { name: 'Tipo' })).toBeNull();
    });

    it('opens the type panel of a typed table from its door', () => {
        mountRowsInTable(<KeyValueRow index={0} measure={unmeasured} line={LINE} />, {
            typed: true,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Tipo' }));

        expect(screen.getByRole('switch', { name: 'Obligatorio' })).toBeVisible();
    });

    it('wears the error line on a key the list cannot be kept under', () => {
        mountRowsInTable(<KeyValueRow index={0} measure={unmeasured} line={LINE} />, {
            keyInvalid: (line) => line.name === 'start',
        });

        expect(screen.getByRole('textbox', { name: 'Clave' })).toBeInvalid();
    });
});
