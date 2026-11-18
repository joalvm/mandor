import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KeyValuePreset } from '../src/components/key-value/key-value-line.js';
import { KeyValuePresets } from '../src/components/key-value/KeyValuePresets.js';
import { KeyValuePresetsDialog } from '../src/components/key-value/KeyValuePresetsDialog.js';
import { mountInTable } from './support/key-value-state.js';

afterEach(cleanup);

const WEB: KeyValuePreset = {
    id: 'web',
    lines: [{ disabled: false, id: '0', name: 'Accept', value: 'text/html' }],
    name: 'web',
};
const MOVIL: KeyValuePreset = {
    id: 'movil',
    lines: [{ disabled: false, id: '0', name: 'X-Device', value: '2' }],
    name: 'móvil',
};

/** The table with its book, and the dialog opened from the toolbar the way a person does. */
function open(presets: readonly KeyValuePreset[]) {
    const onPresetsChange = vi.fn();
    const mounted = mountInTable(
        <>
            <KeyValuePresets />
            <KeyValuePresetsDialog />
        </>,
        { onPresetsChange, presets },
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Preajustes' }), {
        button: 0,
        ctrlKey: false,
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gestionar preajustes' }));

    return { ...mounted, onPresetsChange };
}

function first(elements: HTMLElement[]): HTMLElement {
    const element = elements[0];

    if (element === undefined) {
        throw new Error('no esta');
    }

    return element;
}

/** Text under the focus, the way an editable line receives an edit. */
function write(cell: HTMLElement, text: string): void {
    fireEvent.focus(cell);
    cell.textContent = text;
    fireEvent.input(cell);
}

describe('the dialog that keeps the book of presets', () => {
    it('draws nothing while the book is put away', () => {
        mountInTable(<KeyValuePresetsDialog />, { presets: [WEB] });

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('lists the presets of the book with their ways in', () => {
        open([WEB, MOVIL]);

        const entries = document.querySelectorAll('[data-part="key-value-preset-entry"]');

        expect(screen.getByRole('dialog')).toBeVisible();
        expect(Array.from(entries).map((each) => each.textContent)).toEqual(['web', 'móvil']);
        expect(screen.getAllByRole('button', { name: 'Editar preajuste' })).toHaveLength(2);
    });

    it('says the book is empty when it is', () => {
        open([]);

        expect(screen.getByText('Aún no hay preajustes')).toBeVisible();
    });

    it('deletes one preset and leaves the rest of the book', () => {
        const { onPresetsChange } = open([WEB, MOVIL]);

        fireEvent.click(first(screen.getAllByRole('button', { name: 'Eliminar preajuste' })));

        expect(onPresetsChange).toHaveBeenCalledWith([MOVIL]);
    });

    it('writes a new preset with its name trimmed and without the rows that have no key', async () => {
        const { onPresetsChange } = open([WEB]);

        fireEvent.click(screen.getByRole('button', { name: 'Añadir preajuste' }));
        expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

        write(screen.getByRole('textbox', { name: 'Nombre del preajuste' }), '  movil  ');
        write(screen.getByRole('textbox', { name: 'Clave' }), 'X-Device');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            expect(onPresetsChange).toHaveBeenCalledOnce();
        });

        const saved = onPresetsChange.mock.lastCall?.[0] as readonly KeyValuePreset[];

        expect(saved.map((preset) => preset.name)).toEqual(['web', 'movil']);
        expect(saved[1]?.lines.map((line) => line.name)).toEqual(['X-Device']);
        expect(screen.getByText('web')).toBeVisible();
    });

    it('edits a preset in place: the same id, the new name, the rest of the book as it was', () => {
        const { onPresetsChange } = open([WEB, MOVIL]);

        fireEvent.click(first(screen.getAllByRole('button', { name: 'Editar preajuste' })));

        const name = screen.getByRole('textbox', { name: 'Nombre del preajuste' });

        expect(name).toHaveTextContent('web');

        write(name, 'web2');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(onPresetsChange).toHaveBeenCalledWith([MOVIL, { ...WEB, name: 'web2' }]);
    });

    it('gives a preset up on cancel and goes back to the list', () => {
        const { onPresetsChange } = open([WEB]);

        fireEvent.click(screen.getByRole('button', { name: 'Añadir preajuste' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onPresetsChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Añadir preajuste' })).toBeVisible();
    });

    it('puts the book away from its own door', async () => {
        open([WEB]);

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
        expect(screen.getByLabelText('Estado')).toBeEmptyDOMElement();
    });
});
