import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KeyValueAutoLine } from '../src/components/key-value/key-value-line.js';
import { KeyValueAutoRows } from '../src/components/key-value/KeyValueAutoRows.js';
import { KeyValueAutoToggle } from '../src/components/key-value/KeyValueAutoToggle.js';
import {
    BOTH,
    mountInTable,
    mountRowsInTable,
    TableRows,
    VALUE_ONLY,
} from './support/key-value-state.js';

afterEach(cleanup);

const AUTO: readonly KeyValueAutoLine[] = [
    {
        description: 'La autorización de la pestaña Authorization',
        follow: { label: 'Ir a Authorization' },
        id: 'auth',
        locked: true,
        name: 'Authorization',
        value: 'Bearer ••••',
    },
    { id: 'ct', name: 'Content-Type', value: 'application/json' },
    { calculated: true, id: 'len', name: 'Content-Length', value: '' },
    { id: 'ua', name: 'User-Agent', overriddenBy: 'User-Agent', value: 'Mandor/1.0' },
];

function show(options: Parameters<typeof mountInTable>[1] = {}) {
    const mounted = mountInTable(
        <>
            <KeyValueAutoToggle />
            <TableRows>
                <KeyValueAutoRows />
            </TableRows>
        </>,
        { autoLines: AUTO, columns: BOTH, ...options },
    );

    fireEvent.click(screen.getByRole('button', { name: '4 ocultas' }));

    return mounted;
}

function rowsOf(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>('[data-part="key-value-auto-row"]'));
}

describe('the rows the app adds by itself', () => {
    it('draw nothing until they are asked for', () => {
        const { container } = mountRowsInTable(<KeyValueAutoRows />, { autoLines: AUTO });

        expect(rowsOf(container)).toHaveLength(0);
    });

    it('draw nothing when the app adds nothing', () => {
        const { container } = mountRowsInTable(<KeyValueAutoRows />, { autoLines: [] });

        expect(rowsOf(container)).toHaveLength(0);
    });

    it('come out read-only, each with the line that says why', () => {
        const { container } = show();
        const rows = rowsOf(container);

        expect(rows).toHaveLength(4);
        expect(rows[0]).toHaveTextContent('Authorization');
        expect(rows[0]).toHaveTextContent('Bearer ••••');
        expect(rows[0]).toHaveTextContent('La autorización de la pestaña Authorization');
        expect(container.querySelectorAll('[data-part="editable"]')).toHaveLength(0);
    });

    it('say a value nobody knows yet as the one the send computes', () => {
        const { container } = show();

        expect(rowsOf(container)[2]).toHaveTextContent('<Se calcula al enviar el request>');
    });

    it('strike the row a row of the table takes over', () => {
        const { container } = show();
        const [first, second] = [rowsOf(container)[3], rowsOf(container)[1]];

        expect(first?.querySelectorAll('[data-overridden]')).toHaveLength(2);
        expect(second?.querySelectorAll('[data-overridden]')).toHaveLength(0);
    });

    it('leave a row out of the request with its checkbox, and tell the owner', () => {
        const onAutoLinesChange = vi.fn();

        show({ onAutoLinesChange });

        const [, ct] = screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' });

        if (ct === undefined) {
            throw new Error('el checkbox no esta');
        }

        fireEvent.click(ct);

        expect(onAutoLinesChange).toHaveBeenCalledWith(
            AUTO.map((line) => (line.id === 'ct' ? { ...line, left: true } : line)),
        );
    });

    it('keep the locked row fixed: its checkbox stays grey', () => {
        show();

        const [locked, free] = screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' });

        expect(locked).toBeDisabled();
        expect(free).toBeEnabled();
    });

    it('send the owner to the place of the app a row answers to', () => {
        const onAutoFollow = vi.fn();

        show({ onAutoFollow });
        fireEvent.click(screen.getByRole('button', { name: 'Ir a Authorization' }));

        expect(onAutoFollow).toHaveBeenCalledWith('auth');
    });

    it('offer no way in when nobody listens to it', () => {
        show();

        expect(screen.queryByRole('button', { name: 'Ir a Authorization' })).toBeNull();
    });

    it('lay in the columns in force, no more', () => {
        const { container } = show({ columns: VALUE_ONLY });

        expect(container.querySelectorAll('[data-kv-cell="description"]')).toHaveLength(0);
        expect(container.querySelectorAll('[data-kv-cell="value"]')).toHaveLength(4);
    });
});
