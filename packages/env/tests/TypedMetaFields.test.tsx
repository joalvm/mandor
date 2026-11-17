import type { KeyValueMeta } from '@mandor/schema';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypedMetaFields } from '../src/components/key-value/TypedMetaFields.js';
import { mountAlone } from './support/key-value-state.js';

afterEach(cleanup);

function draw(meta: KeyValueMeta) {
    const onMetaChange = vi.fn();

    mountAlone(<TypedMetaFields meta={meta} onMetaChange={onMetaChange} />);

    return onMetaChange;
}

/** Text under the focus, the way an editable line receives an edit. */
function write(cell: HTMLElement, text: string): void {
    fireEvent.focus(cell);
    cell.textContent = text;
    fireEvent.input(cell);
}

describe('the fields a chosen type carries', () => {
    it('shows the default the pair already has', () => {
        draw({ default: 'abc', type: 'string' });

        expect(screen.getByRole('textbox', { name: 'Valor por defecto' })).toHaveTextContent('abc');
    });

    it('keeps the rest of the meta when the default is written', () => {
        const onMetaChange = draw({ required: true, type: 'string' });

        write(screen.getByRole('textbox', { name: 'Valor por defecto' }), 'abc');

        expect(onMetaChange).toHaveBeenCalledWith({
            default: 'abc',
            required: true,
            type: 'string',
        });
    });

    it('asks for no enum values until the switch says the pair is restricted', () => {
        draw({ type: 'string' });

        expect(screen.getByRole('switch', { name: 'Valores enum posibles' })).not.toBeChecked();
        expect(screen.queryByRole('textbox', { name: 'Valores enum posibles' })).toBeNull();
        expect(screen.queryByText('Sepáralos por comas')).toBeNull();
    });

    it('opens the enum with the empty list the switch promises', () => {
        const onMetaChange = draw({ type: 'string' });

        fireEvent.click(screen.getByRole('switch', { name: 'Valores enum posibles' }));

        expect(onMetaChange).toHaveBeenCalledWith({ enumValues: '', type: 'string' });
    });

    it('takes the enum away when the switch is turned off', () => {
        const onMetaChange = draw({ enumValues: 'a,b', type: 'string' });

        fireEvent.click(screen.getByRole('switch', { name: 'Valores enum posibles' }));

        expect(onMetaChange).toHaveBeenCalledWith({ enumValues: undefined, type: 'string' });
    });

    it('shows the enum values with the way to write them once the pair is restricted', () => {
        const onMetaChange = draw({ enumValues: 'a,b', type: 'string' });

        expect(screen.getByRole('switch', { name: 'Valores enum posibles' })).toBeChecked();
        expect(screen.getByText('Sepáralos por comas')).toBeVisible();

        write(screen.getByRole('textbox', { name: 'Valores enum posibles' }), 'a,b,c');

        expect(onMetaChange).toHaveBeenCalledWith({ enumValues: 'a,b,c', type: 'string' });
    });

    it.each(['integer', 'number'] as const)('writes the bounds of a %s', (type) => {
        const onMetaChange = draw({ max: '9', min: '1', type });

        expect(screen.getByRole('textbox', { name: 'Valor mín' })).toHaveTextContent('1');
        expect(screen.getByRole('textbox', { name: 'Valor máx' })).toHaveTextContent('9');

        write(screen.getByRole('textbox', { name: 'Valor mín' }), '0');
        write(screen.getByRole('textbox', { name: 'Valor máx' }), '10');

        expect(onMetaChange).toHaveBeenNthCalledWith(1, { max: '9', min: '0', type });
        expect(onMetaChange).toHaveBeenNthCalledWith(2, { max: '10', min: '1', type });
    });

    it.each(['string', 'boolean'] as const)('has no bounds to write for a %s', (type) => {
        draw({ type });

        expect(screen.queryByRole('textbox', { name: 'Valor mín' })).toBeNull();
        expect(screen.queryByRole('textbox', { name: 'Valor máx' })).toBeNull();
    });
});
