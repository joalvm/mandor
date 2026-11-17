import { fireEvent, render, screen } from '@testing-library/react';
import { DashIcon } from '@mandor/icons';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { RowNameProvider } from '../../../src/components/row/row-name.js';
import { Checkbox, Field } from '../../../src/index.js';
import { cssOf } from '../../styles/theme-values.js';

describe('the Checkbox primitive', () => {
    it('exposes itself by its label as a checkbox that is out', () => {
        render(
            <Checkbox
                checked={false}
                label="Enviar esta cabecera"
                onCheckedChange={() => undefined}
            />,
        );

        const checkbox = screen.getByRole('checkbox', { name: 'Enviar esta cabecera' });

        expect(checkbox).toBeEnabled();
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('announces the state it is given and reports the change', () => {
        const onCheckedChange = vi.fn();

        render(
            <Checkbox
                checked={false}
                label="Enviar esta cabecera"
                onCheckedChange={onCheckedChange}
            />,
        );

        fireEvent.click(screen.getByRole('checkbox', { name: 'Enviar esta cabecera' }));

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    /**
     * The mixed state is the APG mixed-state checkbox: announced `mixed` and drawn with the
     * dash of "some in, some out" — never the check, which is the mark of a done state.
     */
    it('draws the dash while the children disagree', () => {
        render(
            <Checkbox
                checked="indeterminate"
                label="Cabeceras"
                onCheckedChange={() => undefined}
            />,
        );
        const dash = render(<DashIcon size="sm" />);
        const checkbox = screen.getByRole('checkbox', { name: 'Cabeceras' });

        expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
        expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
        expect(checkbox.querySelector('path')?.getAttribute('d')).toBe(
            dash.container.querySelector('path')?.getAttribute('d'),
        );
    });

    /** The mixed box is as in as the checked one: the fill cannot tell them apart by weight. */
    it('fills the mixed box like the checked one', async () => {
        const css = await cssOf('runtime.css');

        expect(css).toContain("[data-part='checkbox'][data-state='indeterminate'],");
        expect(css).toContain("[data-part='checkbox'][data-state='indeterminate']:hover");
    });

    /**
     * The state fills live in the runtime sheet, the way the switch's do. A utility on the
     * component would sit in the utilities layer, above every layered rule, and the accent of
     * the checked box would never reach the screen — the regression this guards.
     */
    it('leaves its fills to the runtime sheet, not to a utility', async () => {
        const css = await cssOf('runtime.css');

        expect(css).toContain("[data-part='checkbox'] {");
        expect(css).toContain("[data-part='checkbox']:hover {");

        const source = await readFile(
            join(process.cwd(), 'packages', 'ui', 'src', 'components', 'toggle', 'Checkbox.tsx'),
            'utf8',
        );

        expect(source).not.toContain('bg-surface-sunken');
        expect(source).not.toContain(' text-text-primary');
        expect(source).not.toContain('border-border');
        expect(source).not.toContain('hover:border');
    });

    /** The error border is a state fill like the rest: the field it fails in hands it over. */
    it('paints the error border of the field it fails in', async () => {
        render(
            <Field id="headers" label="Cabeceras" error="Elige al menos una">
                <Checkbox
                    checked={false}
                    label="Enviar esta cabecera"
                    onCheckedChange={() => undefined}
                />
            </Field>,
        );

        expect(screen.getByRole('checkbox', { name: 'Enviar esta cabecera' })).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(await cssOf('runtime.css')).toContain("[data-part='checkbox'][aria-invalid='true']");
    });

    /**
     * The order of the sheet is the contract: the checked rule stands after the disabled one,
     * so a disabled box keeps the accent of its state and loses only light — the dimming is
     * the opacity the component carries, which no layered rule can take from it.
     */
    it('keeps the accent of a checked box that is disabled, dimmed', async () => {
        const css = await cssOf('runtime.css');

        expect(css.indexOf("[data-part='checkbox']:disabled")).toBeLessThan(
            css.indexOf("[data-part='checkbox'][data-state='checked']"),
        );

        render(<Checkbox checked disabled label="Fija" onCheckedChange={() => undefined} />);

        expect(screen.getByRole('checkbox', { name: 'Fija' })).toHaveClass('disabled:opacity-60');
    });

    /** At twelve pixels the collection check is a hairline: the box draws it a weight heavier. */
    it('draws its marks a weight heavier than the collection ships them', async () => {
        const css = await cssOf('runtime.css');

        expect(css).toContain("[data-part='checkbox'] [data-part='icon']");
        expect(css).toContain('stroke-width: 1.5');
    });

    /** A row holds the one tab stop there is, and the mark in it is reached through the row. */
    it('stays out of the tab order when the row it sits in holds the focus', () => {
        render(
            <RowNameProvider value="row-label">
                <Checkbox
                    checked={false}
                    label="Enviar esta cabecera"
                    onCheckedChange={() => undefined}
                />
            </RowNameProvider>,
        );

        expect(screen.getByRole('checkbox', { name: 'Enviar esta cabecera' })).toHaveAttribute(
            'tabindex',
            '-1',
        );
    });

    it('takes its own tab stop when it sits outside a row', () => {
        render(
            <Checkbox
                checked={false}
                label="Enviar esta cabecera"
                onCheckedChange={() => undefined}
            />,
        );

        expect(screen.getByRole('checkbox', { name: 'Enviar esta cabecera' })).not.toHaveAttribute(
            'tabindex',
            '-1',
        );
    });
});
