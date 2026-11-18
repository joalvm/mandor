import type { KeyValueMeta } from '@mandor/schema';
import { Button } from '@mandor/ui';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypePopover } from '../src/components/key-value/TypePopover.js';
import { mountAlone } from './support/key-value-state.js';

afterEach(cleanup);

/** The popover of a row, opened from the control it wraps the way a person does. */
function open(meta: KeyValueMeta | undefined) {
    const onMetaChange = vi.fn();

    mountAlone(
        <TypePopover meta={meta} onMetaChange={onMetaChange}>
            <Button>Fila</Button>
        </TypePopover>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fila' }));

    return onMetaChange;
}

describe('the popover that says what a pair promises about its type', () => {
    it('stays shut until the control it wraps is pressed', () => {
        mountAlone(
            <TypePopover meta={undefined} onMetaChange={vi.fn()}>
                <Button>Fila</Button>
            </TypePopover>,
        );

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.queryByRole('switch', { name: 'Obligatorio' })).toBeNull();
    });

    it('offers required and deprecated before any type is chosen, and nothing more', () => {
        open(undefined);

        expect(screen.getByRole('dialog', { name: 'Tipo del par' })).toBeVisible();
        expect(screen.getByRole('switch', { name: 'Obligatorio' })).not.toBeChecked();
        expect(screen.getByRole('switch', { name: 'Obsoleto' })).not.toBeChecked();
        expect(screen.queryByRole('button', { name: 'Quitar tipo' })).toBeNull();
        expect(screen.queryByRole('textbox', { name: 'Valor por defecto' })).toBeNull();
    });

    it('keeps the meta it had when required is turned on', () => {
        const onMetaChange = open({ deprecated: true, type: 'string' });

        fireEvent.click(screen.getByRole('switch', { name: 'Obligatorio' }));

        expect(onMetaChange).toHaveBeenCalledWith({
            deprecated: true,
            required: true,
            type: 'string',
        });
    });

    it('keeps the meta it had when deprecated is turned off', () => {
        const onMetaChange = open({ deprecated: true, required: true });

        fireEvent.click(screen.getByRole('switch', { name: 'Obsoleto' }));

        expect(onMetaChange).toHaveBeenCalledWith({ deprecated: false, required: true });
    });

    it('picks a type from the list and keeps what the pair already promised', async () => {
        const onMetaChange = open({ required: true });

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Tipo' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('option', { name: 'integer' }));

        expect(onMetaChange).toHaveBeenCalledWith({ required: true, type: 'integer' });
    });

    it('grows the fields of the type once one is chosen', () => {
        open({ type: 'number' });

        expect(screen.getByRole('textbox', { name: 'Valor por defecto' })).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Valor mín' })).toBeVisible();
    });

    it('clears the whole meta from its own button', () => {
        const onMetaChange = open({ required: true, type: 'string' });

        fireEvent.click(screen.getByRole('button', { name: 'Quitar tipo' }));

        expect(onMetaChange).toHaveBeenCalledWith(undefined);
    });
});
