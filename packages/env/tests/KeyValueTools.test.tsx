import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KeyValueTools } from '../src/components/key-value/KeyValueTools.js';
import { BOTH, mountInTable, VALUE_ONLY } from './support/key-value-state.js';

afterEach(cleanup);

/** Radix opens a menu on the pointerdown of its trigger. */
function openMenu(name: string): void {
    fireEvent.pointerDown(screen.getByRole('button', { name }), { button: 0, ctrlKey: false });
}

describe('the ways to work a whole table', () => {
    it('switches between the rows and the bulk text, and the button says where it goes', () => {
        mountInTable(<KeyValueTools />);

        fireEvent.click(screen.getByRole('button', { name: 'Edición masiva' }));

        expect(screen.getByLabelText('Estado')).toHaveTextContent('bulk');

        fireEvent.click(screen.getByRole('button', { name: 'Editar clave-valor' }));

        expect(screen.getByLabelText('Estado')).toBeEmptyDOMElement();
    });

    it('takes the bulk text away when the owner says the lines are one truth', () => {
        mountInTable(<KeyValueTools />, { bulkEdit: false });

        expect(screen.queryByRole('button', { name: 'Edición masiva' })).toBeNull();
    });

    it('turns the value and the description column on and off from its menu', () => {
        const { onColumns } = mountInTable(<KeyValueTools />, { columns: BOTH });

        openMenu('Más acciones');

        fireEvent.click(screen.getByRole('menuitem', { name: 'Valor' }));
        expect(onColumns).toHaveBeenLastCalledWith({ description: true, value: false });

        openMenu('Más acciones');
        fireEvent.click(screen.getByRole('menuitem', { name: 'Descripción' }));
        expect(onColumns).toHaveBeenLastCalledWith({ description: false, value: false });
    });

    it('offers the column menu only to a table that lets its columns go', () => {
        mountInTable(<KeyValueTools />, { columnMenu: false });

        expect(screen.queryByRole('button', { name: 'Más acciones' })).toBeNull();
    });

    it('offers the book of presets only to a table that was given one', () => {
        mountInTable(<KeyValueTools />);
        expect(screen.queryByRole('button', { name: 'Preajustes' })).toBeNull();
    });

    it('offers the book of presets beside the bulk text', () => {
        mountInTable(<KeyValueTools />, { presets: [] });

        expect(screen.getByRole('button', { name: 'Preajustes' })).toBeVisible();
    });

    it('puts the presets and the column menu away while the text is bulk', () => {
        mountInTable(<KeyValueTools />, { columns: VALUE_ONLY, presets: [] });

        fireEvent.click(screen.getByRole('button', { name: 'Edición masiva' }));

        expect(screen.queryByRole('button', { name: 'Preajustes' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Más acciones' })).toBeNull();
    });
});
