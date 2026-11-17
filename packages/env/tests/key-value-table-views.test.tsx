import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { at, mount } from './support/key-value.js';

afterEach(cleanup);

describe('the other faces of the key-value table', () => {
    it('says the same lines as one bulk text, and reads them back when it returns', () => {
        const onLinesChange = vi.fn();

        mount(onLinesChange);

        fireEvent.click(screen.getByRole('button', { name: 'Edición masiva' }));

        const bulk = screen.getByRole('textbox', { name: 'Edición masiva de pares' });

        expect(bulk).toHaveValue('start:2024-07-16\n//end:2024-08-16\ntoken:{{token}}');

        fireEvent.change(bulk, { target: { value: 'start:2024-07-20\ntoken:{{token}}' } });

        fireEvent.click(screen.getByRole('button', { name: 'Editar clave-valor' }));

        expect(onLinesChange).toHaveBeenLastCalledWith([
            expect.objectContaining({ id: '0', name: 'start', value: '2024-07-20' }),
            expect.objectContaining({ id: '2', name: 'token' }),
        ]);
    });

    it('shows the description column only while the menu asks for it', () => {
        mount();

        expect(screen.queryByText('Descripción')).toBeNull();

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Más acciones' }));

        fireEvent.click(at(screen.getAllByRole('menuitem', { name: 'Descripción' }), 0));

        expect(screen.getByText('Descripción')).toBeVisible();
    });

    it('offers the type of a pair only in a table that carries types', () => {
        mount(undefined, { typed: false });

        expect(screen.queryByRole('button', { name: 'Tipo' })).toBeNull();
    });

    it('promises a type from the popover, and wears it as a badge on the key', () => {
        mount(undefined, { typed: true });

        expect(screen.getByText('number')).toBeVisible();

        fireEvent.click(at(screen.getAllByRole('button', { name: 'Tipo' }), 0));

        const combo = screen.getByRole('combobox', { name: 'Tipo' });

        fireEvent.keyDown(combo, { key: 'Enter' });

        fireEvent.click(at(screen.getAllByRole('option', { name: 'string' }), 0));

        expect(screen.getAllByText('string')[0]).toBeVisible();
    });
});
