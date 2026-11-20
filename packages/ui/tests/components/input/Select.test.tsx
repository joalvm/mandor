import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Field, Select } from '../../../src/index.js';
import { byPart } from '../../../src/testing/by-part.js';
import { cssOf } from '../../styles/theme-values.js';

const TRANSPORTS = [
    { label: 'WebSocket', value: 'ws' },
    { label: 'Polling', value: 'polling' },
];

describe('the Select trigger', () => {
    it('paints the error of the field it stands in', () => {
        render(
            <Field id="transport" label="Transporte" error="Elige un transporte">
                <Select label="Transporte" onValueChange={() => undefined} options={TRANSPORTS} />
            </Field>,
        );

        const trigger = screen.getByRole('combobox', { name: 'Transporte' });

        expect(trigger).toHaveAttribute('aria-invalid', 'true');
        expect(trigger).toHaveClass('border-border-error');
    });

    /** Wherever it stands it is a field among fields: the box, the ground and the height of an input. */
    it('draws the box of an input, alone and in a field, and keeps its edge lit while open', () => {
        const { rerender } = render(
            <Select label="Transporte" onValueChange={() => undefined} options={TRANSPORTS} />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Transporte' });

        expect(trigger).toHaveClass('border-border-strong', 'bg-transparent', 'h-field');
        expect(trigger).not.toHaveClass('border-transparent', 'bg-surface-sunken');

        fireEvent.keyDown(trigger, { key: 'ArrowDown' });

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(trigger).toHaveClass('aria-expanded:border-border-hover');

        rerender(
            <Field id="transport" label="Transporte">
                <Select label="Transporte" onValueChange={() => undefined} options={TRANSPORTS} />
            </Field>,
        );

        expect(screen.getByRole('combobox', { name: 'Transporte' })).toHaveClass('h-field');
    });

    /** A placeholder reads as pending text, so it carries the tone of pending text. */
    it('dims the placeholder until a value is chosen', () => {
        const { rerender } = render(
            <Select
                label="Transporte"
                onValueChange={() => undefined}
                options={TRANSPORTS}
                placeholder="Sin transporte"
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Transporte' });

        expect(within(trigger).getByText('Sin transporte').parentElement).toHaveClass(
            'text-text-secondary',
        );

        rerender(
            <Select
                label="Transporte"
                onValueChange={() => undefined}
                options={TRANSPORTS}
                placeholder="Sin transporte"
                value="ws"
            />,
        );

        expect(within(trigger).getByText('WebSocket').parentElement).not.toHaveClass(
            'text-text-secondary',
        );
    });

    it('answers by its part as well as by its role', () => {
        render(<Select label="Transporte" onValueChange={() => undefined} options={TRANSPORTS} />);

        expect(byPart('select-trigger')).toBe(screen.getByRole('combobox', { name: 'Transporte' }));
    });

    /** A list narrower than the trigger it fell from reads as another control. */
    it('opens at least as wide as its trigger', async () => {
        const css = await cssOf('runtime.css');

        expect(css).toContain("[data-part='select-content']");
        expect(css).toContain('min-width: var(--radix-select-trigger-width)');
    });

    /**
     * The chosen line wears weight, not a glyph: the mark lives in the sheet, keyed by the
     * part, the way every other state of the system is told.
     */
    it('marks the chosen line with weight from the sheet', async () => {
        const css = await cssOf('runtime.css');

        expect(css).toContain("[data-part='select-item'][data-state='checked']");
        expect(css).toContain('var(--mandor-weight-semibold)');
    });

    /** A long list reads by its kinds: each group under its name, a rule between them. */
    it('draws groups of options under their names, choosable by their lines alone', () => {
        const chosen: string[] = [];

        render(
            <Select
                label="Cuerpo"
                onValueChange={(value) => {
                    chosen.push(value);
                }}
                options={[
                    { label: 'Texto', options: [{ label: 'JSON', value: 'json' }] },
                    { label: 'Otros', options: [{ label: 'Ninguno', value: 'none' }] },
                ]}
                value="json"
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Cuerpo' });

        expect(within(trigger).getByText('JSON')).toBeInTheDocument();

        fireEvent.keyDown(trigger, { key: 'ArrowDown' });

        const list = screen.getByRole('listbox');

        expect(within(list).getAllByRole('group')).toHaveLength(2);
        expect(within(list).getByText('Otros')).toBeInTheDocument();
        expect(list.querySelectorAll("[data-part='select-separator']")).toHaveLength(1);

        fireEvent.click(within(list).getByRole('option', { name: 'Ninguno' }));

        expect(chosen).toEqual(['none']);
    });

    /**
     * A trigger as wide as the choice of the moment jumps at every change; one as wide as its
     * longest line, the placeholder among them, holds still, the way a native select does.
     */
    it('holds the width of its longest line, whichever is chosen', async () => {
        render(
            <Select
                label="Cuerpo"
                onValueChange={() => undefined}
                options={[
                    { label: 'Texto', options: [{ label: 'JSON', value: 'json' }] },
                    { label: 'Ninguno', value: 'none' },
                ]}
                placeholder="Sin cuerpo"
                value="json"
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Cuerpo' });
        const sizers = [...trigger.querySelectorAll("[data-part='select-sizer']")];

        expect(sizers.map((sizer) => sizer.getAttribute('data-label'))).toEqual([
            'Sin cuerpo',
            'JSON',
            'Ninguno',
        ]);
        expect(sizers.every((sizer) => sizer.getAttribute('aria-hidden') === 'true')).toBe(true);
        expect(trigger).toHaveTextContent(/^JSON$/u);

        const css = await cssOf('runtime.css');

        expect(css).toContain("[data-part='select-sizer']::before");
        expect(css).toContain('content: attr(data-label)');
    });

    it('can be as wide as the text chosen, holding no room for the longer lines', () => {
        render(
            <Select
                fitChosen
                label="Estado"
                onValueChange={() => undefined}
                options={[
                    { label: '200 OK', value: '200' },
                    { label: '422 Unprocessable Entity', value: '422' },
                ]}
                value="200"
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Estado' });

        expect(trigger.querySelectorAll("[data-part='select-sizer']")).toHaveLength(0);
        expect(trigger).toHaveTextContent(/^200 OK$/u);
    });
});
