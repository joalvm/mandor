import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    type KeyValuePreset,
    withKeyValuePreset,
} from '../src/components/key-value/key-value-line.js';
import { LINES, at, mount } from './support/key-value.js';

afterEach(cleanup);

const WEB: KeyValuePreset = {
    id: 'web',
    lines: [
        { disabled: false, id: '0', name: 'Accept', value: 'text/html' },
        { disabled: false, id: '1', name: 'Accept-Language', value: 'es-ES,es' },
    ],
    name: 'web',
};

const LIBRO: KeyValuePreset[] = [WEB];

/** Radix opens the menu on pointerdown of its trigger. */
function abrirPresets(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Preajustes' }), {
        button: 0,
        ctrlKey: false,
    });
}

describe('the book of presets', () => {
    it('takes a preset into the table whole, each line under an identity of its own', () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange, { presets: LIBRO });

        abrirPresets();
        fireEvent.click(screen.getByRole('menuitem', { name: 'web' }));

        expect(onLinesChange).toHaveBeenCalledWith(withKeyValuePreset(LINES, WEB));
    });

    it('the manager keeps the book: add, rename and delete without losing the rest', async () => {
        const onPresetsChange = vi.fn();

        mount(vi.fn(), { onPresetsChange, presets: LIBRO });

        abrirPresets();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Gestionar preajustes' }));

        const dialogo = screen.getByRole('dialog');

        expect(dialogo.textContent).toContain('web');
        expect(screen.getByRole('button', { name: 'Editar preajuste' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Eliminar preajuste' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar preajuste' }));

        await waitFor(() => {
            expect(onPresetsChange).toHaveBeenCalledWith([]);
        });
    });

    it('a preset is written once, with its name and its rows, and lands in the book', async () => {
        const onPresetsChange = vi.fn();

        mount(vi.fn(), { onPresetsChange, presets: [] });

        abrirPresets();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Gestionar preajustes' }));

        fireEvent.click(screen.getByRole('button', { name: 'Añadir preajuste' }));

        const nombre = screen.getByRole('textbox', { name: 'Nombre del preajuste' });

        fireEvent.focus(nombre);
        nombre.textContent = 'movil';
        fireEvent.input(nombre);

        const fila = at(screen.getAllByRole('textbox', { name: 'Clave' }), 0);

        fireEvent.focus(fila);
        fila.textContent = 'X-Device';
        fireEvent.input(fila);

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            expect(onPresetsChange).toHaveBeenCalledWith([
                expect.objectContaining({
                    lines: [expect.objectContaining({ name: 'X-Device' })],
                    name: 'movil',
                }),
            ]);
        });
    });

    it('a preset without a name does not save', () => {
        const onPresetsChange = vi.fn();

        mount(vi.fn(), { onPresetsChange, presets: [] });

        abrirPresets();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Gestionar preajustes' }));
        fireEvent.click(screen.getByRole('button', { name: 'Añadir preajuste' }));

        expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
        expect(onPresetsChange).not.toHaveBeenCalled();
    });
});
