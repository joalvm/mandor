import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MethodPicker } from '../../../src/index.js';

const METHODS = ['GET', 'POST', 'DELETE'] as const;

function renderPicker(value: string, onValueChange = vi.fn()) {
    render(
        <MethodPicker
            accepts={(method) => /^[A-Z]+$/.test(method)}
            label="Método"
            methods={METHODS}
            onValueChange={onValueChange}
            otherField="Método propio"
            otherLabel="Otro método…"
            value={value}
        />,
    );

    return onValueChange;
}

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function open(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: /Método/ }), {
        button: 0,
        ctrlKey: false,
    });
}

describe('the verb of the address bar (MethodPicker)', () => {
    it('says the verb in force, in its hue, on the trigger', () => {
        renderPicker('POST');

        const trigger = screen.getByRole('button', { name: 'Método POST' });

        expect(trigger.querySelector('[data-part="method-mark"]')).toHaveClass(
            'text-text-method-post',
        );
    });

    it('chooses a verb from the list, each line in its own hue', async () => {
        const onValueChange = renderPicker('GET');

        open();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'DELETE' }));

        expect(onValueChange).toHaveBeenCalledWith('DELETE');
    });

    it('lists the verb in force even when the list does not offer it', async () => {
        renderPicker('PURGE');

        open();

        expect(await screen.findByRole('menuitem', { name: 'PURGE' })).toBeVisible();
    });

    it('takes a verb of its own in a field where the verb stood, upper-cased', async () => {
        const onValueChange = renderPicker('GET');

        open();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Otro método…' }));

        const field = await screen.findByRole('textbox', { name: 'Método propio' });

        field.textContent = 'purge';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(onValueChange).toHaveBeenCalledWith('PURGE');
    });

    it('keeps the field open on a verb the owner refuses', async () => {
        const onValueChange = renderPicker('GET');

        open();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Otro método…' }));

        const field = await screen.findByRole('textbox', { name: 'Método propio' });

        field.textContent = 'no vale';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(onValueChange).not.toHaveBeenCalled();
        expect(field).toHaveAttribute('aria-invalid', 'true');
    });
});
