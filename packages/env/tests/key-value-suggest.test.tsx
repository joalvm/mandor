import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { at, editableOf, mount } from './support/key-value.js';

afterEach(cleanup);

const NOMBRES = ['Accept', 'Accept-Encoding', 'User-Agent'];

function escribir(celda: HTMLElement, texto: string): void {
    fireEvent.focus(celda);
    celda.textContent = texto;
    fireEvent.input(celda);
}

describe('the key cell that suggests names', () => {
    it('hangs the names that still fit from the cell while it is being written', async () => {
        mount(vi.fn(), { keySuggestions: NOMBRES });

        escribir(at(screen.getAllByRole('textbox', { name: 'Clave' }), 0), 'acc');

        await screen.findByRole('option', { name: 'Accept' });
        await screen.findByRole('option', { name: 'Accept-Encoding' });
        expect(screen.queryByRole('option', { name: 'User-Agent' })).toBeNull();
    });

    it('the keyboard walks the list while it is open, and a pick writes the name in place', async () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange, { keySuggestions: NOMBRES });

        const celda = at(screen.getAllByRole('textbox', { name: 'Clave' }), 0);

        escribir(celda, '');

        await screen.findByRole('option', { name: 'Accept' });

        fireEvent.keyDown(celda, { key: 'ArrowDown' });
        fireEvent.keyDown(celda, { key: 'Enter' });

        await waitFor(() => {
            expect(celda.textContent).toBe('Accept-Encoding');
        });
        expect(onLinesChange).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: '0', name: 'Accept-Encoding' })]),
        );
    });

    it('a query nothing starts still answers with the name that carries it', async () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange, { keySuggestions: NOMBRES });

        const celda = at(screen.getAllByRole('textbox', { name: 'Clave' }), 0);

        escribir(celda, 'enc');

        await screen.findByRole('option', { name: 'Accept-Encoding' });
        expect(screen.queryByRole('option', { name: 'User-Agent' })).toBeNull();

        fireEvent.keyDown(celda, { key: 'Enter' });

        await waitFor(() => {
            expect(celda.textContent).toBe('Accept-Encoding');
        });
    });

    it('escape sends the list away, and the grid walks with the arrows again', async () => {
        mount(vi.fn(), { keySuggestions: NOMBRES });

        const celda = at(screen.getAllByRole('textbox', { name: 'Clave' }), 0);

        escribir(celda, '');

        await screen.findByRole('option', { name: 'Accept' });

        fireEvent.keyDown(celda, { key: 'Escape' });

        expect(screen.queryAllByRole('option')).toHaveLength(0);

        fireEvent.keyDown(celda, { key: 'ArrowDown' });

        expect(document.activeElement).toBe(editableOf(document.body, '1', 'key'));
    });

    it('a table given no names to suggest hangs no list at all', () => {
        mount(vi.fn());

        escribir(at(screen.getAllByRole('textbox', { name: 'Clave' }), 0), 'acc');

        expect(screen.queryAllByRole('listbox')).toHaveLength(0);
    });
});
