import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KeyValueLine } from '../src/components/key-value/key-value-line.js';
import { at, editableOf, mount } from './support/key-value.js';

afterEach(cleanup);

describe('the key-value table', () => {
    it('draws its toolbar, its head, one row per line and the empty row at the end', () => {
        mount();

        expect(screen.getByText('Parámetros de consulta')).toBeVisible();
        expect(screen.getByText('Clave')).toBeVisible();
        expect(screen.getAllByRole('textbox', { name: 'Clave' })).toHaveLength(4);
        expect(screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' })).toHaveLength(3);
    });

    it('brings a line to life from the empty row, and the caret lands in the new line', () => {
        const onLinesChange = vi.fn();
        const container = mount(onLinesChange);

        const ghost = at(screen.getAllByRole('textbox', { name: 'Clave' }), 3);

        fireEvent.focus(ghost);
        ghost.textContent = 'nuevo';
        fireEvent.input(ghost);

        expect(onLinesChange).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ disabled: false, id: '3', name: 'nuevo' }),
            ]),
        );
        expect(editableOf(container, '3', 'key')).toBe(document.activeElement);
    });

    it('the tabulator takes the editable cells one after another, in one press', () => {
        const container = mount();

        function editable(row: string, cell: string): HTMLElement {
            const el = editableOf(container, row, cell);

            if (el === null) {
                throw new Error('no esta');
            }

            return el;
        }

        const valor = editable('0', 'value');

        fireEvent.keyDown(editable('0', 'key'), { key: 'Tab' });

        expect(document.activeElement).toBe(valor);

        fireEvent.keyDown(valor, { key: 'Tab' });

        expect(document.activeElement).toBe(editable('1', 'key'));
    });

    it('the tabulator leaves the table at its ends, and the empty last row is one of its cells', () => {
        const container = mount();

        function editable(row: string, cell: string): HTMLElement {
            const el = editableOf(container, row, cell);

            if (el === null) {
                throw new Error('no esta');
            }

            return el;
        }

        expect(fireEvent.keyDown(editable('ghost', 'key'), { key: 'Tab' })).toBe(false);
        expect(document.activeElement).toBe(editable('ghost', 'value'));
        expect(fireEvent.keyDown(editable('ghost', 'value'), { key: 'Tab' })).toBe(true);
        expect(fireEvent.keyDown(editable('0', 'key'), { key: 'Tab', shiftKey: true })).toBe(true);
    });

    it('switches a pair off with its checkbox', () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange);

        const check = at(screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' }), 0);

        fireEvent.click(check);

        expect(onLinesChange).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ disabled: true, id: '0' })]),
        );
    });

    it('takes a pair out of the table with the door of its row', () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange);

        const door = at(screen.getAllByRole('button', { name: 'Quitar entrada' }), 1);

        fireEvent.click(door);

        expect(onLinesChange).toHaveBeenCalledWith([
            expect.objectContaining({ id: '0', name: 'start' }),
            expect.objectContaining({ id: '2', name: 'token' }),
        ]);
    });

    it('walks the grid with the arrows: down changes the row, the column stays', () => {
        const container = mount();

        const first = editableOf(container, '0', 'key');

        if (first === null) {
            throw new Error('la celda no existe');
        }

        fireEvent.focus(first);
        fireEvent.keyDown(first, { key: 'ArrowDown' });

        expect(document.activeElement).toBe(editableOf(container, '1', 'key'));
    });

    it('carries a row by its handle to where the pointer lets it go', () => {
        const onLinesChange = vi.fn();
        const container = mount(onLinesChange);

        const handle = at(screen.getAllByRole('button', { name: 'Arrastrar para reordenar' }), 0);

        handle.setPointerCapture = () => undefined;

        fireEvent.pointerDown(handle, { pointerId: 1 });

        fireEvent.pointerMove(handle, { clientY: 10_000, pointerId: 1 });

        fireEvent.pointerUp(handle, { pointerId: 1 });

        const last = onLinesChange.mock.lastCall?.[0] as readonly KeyValueLine[];

        expect(last.map((line) => line.id)).toEqual(['1', '2', '0']);
        expect(container.querySelector('[data-dragging]')).toBeNull();
    });
});

describe('the toolbar of a table with less to offer', () => {
    it('carries no bulk text and no column menu when the owner says so', () => {
        const lines: KeyValueLine[] = [
            { disabled: false, id: '0', name: 'base_url', value: 'http://localhost:81' },
        ];

        mount(undefined, { bulkEdit: false, columnMenu: false, lines, variables: false });

        expect(screen.queryByText('Edición masiva')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Más acciones' })).not.toBeInTheDocument();
        expect(screen.getByText('Parámetros de consulta')).toBeVisible();
    });

    it('keeps the bulk text and the column menu by default', () => {
        mount();

        expect(screen.getByText('Edición masiva')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Más acciones' })).toBeVisible();
    });
});
