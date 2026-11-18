import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
    withKeyValuePreset,
    type KeyValuePreset,
} from '../src/components/key-value/key-value-line.js';
import { KeyValuePresets } from '../src/components/key-value/KeyValuePresets.js';
import { FIXTURE, mountInTable } from './support/key-value-state.js';

afterEach(cleanup);

const WEB: KeyValuePreset = {
    id: 'web',
    lines: [{ disabled: false, id: 'x', name: 'Accept', value: 'text/html' }],
    name: 'web',
};
const MOVIL: KeyValuePreset = { id: 'movil', lines: [], name: 'móvil' };

/** Radix opens a menu on the pointerdown of its trigger. */
function openMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Preajustes' }), {
        button: 0,
        ctrlKey: false,
    });
}

describe('the book of presets in the toolbar', () => {
    it('is not there for a table that was given no book', () => {
        mountInTable(<KeyValuePresets />);

        expect(screen.queryByRole('button', { name: 'Preajustes' })).toBeNull();
    });

    it('lists the way into the manager first, then one entry per preset', () => {
        mountInTable(<KeyValuePresets />, { presets: [WEB, MOVIL] });

        openMenu();

        expect(screen.getAllByRole('menuitem').map((each) => each.textContent)).toEqual([
            'Gestionar preajustes',
            'web',
            'móvil',
        ]);
    });

    it('takes a preset into the table whole, under identities of its own', () => {
        const { onLines } = mountInTable(<KeyValuePresets />, { presets: [WEB] });

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'web' }));

        expect(onLines).toHaveBeenCalledWith(withKeyValuePreset(FIXTURE, WEB));
    });

    it('opens the manager from its own entry', () => {
        mountInTable(<KeyValuePresets />, { presets: [WEB] });

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Gestionar preajustes' }));

        expect(screen.getByLabelText('Estado')).toHaveTextContent('managing');
    });
});
