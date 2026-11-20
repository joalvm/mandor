import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoadingIcon, SendIcon } from '@mandor/icons';

import { byPart } from '../../src/testing/by-part.js';
import { cssOf } from '../styles/theme-values.js';
import { Button, Field, IconButton, Input, Select, TooltipProvider } from '../../src/index.js';

describe('the control primitives', () => {
    it('exposes buttons by their accessible labels', () => {
        render(
            <TooltipProvider>
                <Button onClick={vi.fn()}>
                    <SendIcon size="sm" />
                    Guardar
                </Button>
                <IconButton icon="search" label="Buscar" />
            </TooltipProvider>,
        );

        const button = screen.getByRole('button', { name: 'Guardar' });
        const iconButton = screen.getByRole('button', { name: 'Buscar' });

        expect(button).toBeEnabled();
        expect(button.querySelector('svg')).toHaveAttribute('width', '14');
        // The window draws its own tooltip: a `title` too and the label arrives twice, ours
        // beside the one the browser puts up a second later.
        expect(iconButton).not.toHaveAttribute('title');
        expect(iconButton.querySelector('svg')).toHaveAttribute('width', '16');
    });

    /**
     * The pending overlay hides the contents from the eye, not from the reader: a button whose
     * name vanishes the moment it is pressed leaves the assistive tech holding a disabled button
     * with no name at all. jsdom loads no stylesheet, so a visibility class does nothing here:
     * the guard watches the class itself, the one that erases the name in the browser.
     */
    it('keeps the accessible name while the action runs', async () => {
        vi.useFakeTimers();
        const arc = render(<LoadingIcon />);

        render(<Button loading>Guardar</Button>);

        act(() => {
            vi.advanceTimersByTime(400);
        });

        const button = screen.getByRole('button', { name: 'Guardar' });

        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(byPart('button-pending', button)).toBeVisible();
        expect(byPart('button-pending', button).querySelector('path')?.getAttribute('d')).toBe(
            arc.container.querySelector('path')?.getAttribute('d'),
        );
        expect(byPart('button-contents', button)).not.toHaveClass('invisible');
        expect(byPart('button-contents', button)).not.toHaveClass('hidden');
        vi.useRealTimers();

        // The arc turns while it waits — a still one reads as a broken glyph, not as work.
        // jsdom runs no animation, so the sheet is what pins the turn.
        const css = await cssOf('runtime.css');

        expect(css).toContain('@keyframes mandor-spin');
        expect(css).toContain("[data-part='button-pending'] [data-part='icon']");
    });

    /**
     * At the default glyph size the smallest square has no room left: the glyph sits flush
     * against the border it is about to draw. The xs box takes the small glyph, so the air
     * around it matches the rest of the scale.
     */
    it('gives the smallest square the small glyph', () => {
        render(
            <TooltipProvider>
                <IconButton icon="add" label="Añadir" size="xs" />
            </TooltipProvider>,
        );

        expect(screen.getByRole('button', { name: 'Añadir' }).querySelector('svg')).toHaveAttribute(
            'width',
            '14',
        );
    });

    it('exposes why a disabled control cannot run, and says it once', async () => {
        render(
            <TooltipProvider delayDuration={0}>
                <Button disabled disabledReason="Falta una conexión">
                    Enviar
                </Button>
            </TooltipProvider>,
        );

        const button = screen.getByRole('button', { name: 'Enviar' });
        const hoverable = button.closest('[data-part="disabled-control"]');

        fireEvent.focus(hoverable ?? button);

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Falta una conexión');
        expect(button).not.toHaveAttribute('title');
    });

    /**
     * The wrapper is the box the grid sees. An inline-flex span lets the field inside shrink to
     * its content, so a disabled field would sit in its cell narrower than the enabled one
     * beside it. A grid stretches the wrapper; a flex band still sizes it to its content.
     */
    it('keeps a disabled field as wide as the enabled one beside it', () => {
        render(
            <TooltipProvider>
                <Field help="Lo fija el perfil." id="campo-reintentos" label="Reintentos">
                    <Input
                        disabled
                        disabledReason="El perfil del origen decide los reintentos"
                        label="Reintentos"
                        onValueChange={() => undefined}
                        value="3"
                    />
                </Field>
            </TooltipProvider>,
        );

        expect(byPart('disabled-control', document.body)).toHaveClass('inline-grid');
    });

    it('replaces field help with the error and wires the control to both', () => {
        render(
            <Field id="url" label="URL" help="Usa wss" error="URL inválida">
                <Input label="URL" onValueChange={() => undefined} value="" />
            </Field>,
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });
        const message = screen.getByRole('alert');

        expect(textbox).toHaveAttribute('id', 'url');
        expect(textbox).toHaveAttribute('aria-invalid', 'true');
        expect(textbox).toHaveAttribute('aria-describedby', message.id);
        expect(screen.getByText('URL inválida')).toBeVisible();
        expect(screen.queryByText('Usa wss')).toBeNull();
        expect(message.querySelector('svg')).toHaveAttribute('width', '14');
    });

    it('hands the id of the field to the list it wraps', () => {
        render(
            <Field id="transport" label="Transporte">
                <Select
                    label="Transporte"
                    onValueChange={() => undefined}
                    options={[{ label: 'WebSocket', value: 'ws' }]}
                    value="ws"
                />
            </Field>,
        );

        expect(screen.getByText('Transporte')).toHaveAttribute('for', 'transport');
        expect(screen.getByRole('combobox', { name: 'Transporte' })).toHaveAttribute(
            'id',
            'transport',
        );
    });

    /**
     * A control sits on a fixed-height row, so a label that wraps shoves the row it lives on:
     * the trigger cuts its value with an ellipsis and the list never breaks a option in two.
     */
    it('keeps its value and every option on a single line', async () => {
        render(
            <Select
                label="Transporte"
                onValueChange={() => undefined}
                options={[
                    { label: 'WebSocket only', value: 'ws' },
                    { label: 'Polling, then upgrade', value: 'polling' },
                ]}
                value="ws"
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Transporte' });

        // Radix re-renders the chosen label on a span of its own, one wrapper in.
        expect(within(trigger).getByText('WebSocket only').parentElement).toHaveClass('truncate');

        fireEvent.keyDown(trigger, { key: 'ArrowDown' });

        const listbox = await screen.findByRole('listbox');

        for (const option of within(listbox).getAllByRole('option')) {
            expect(option).toHaveClass('whitespace-nowrap');
        }
    });

    it('leaves a control outside a field unwired', () => {
        render(<Input label="Nombre" onValueChange={() => undefined} value="" />);

        expect(screen.getByRole('textbox', { name: 'Nombre' })).not.toHaveAttribute('id');
        expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAttribute(
            'aria-invalid',
            'false',
        );
    });

    /** The secondary button is the strong gray of a control: a fill, never an outline. */
    it('fills the secondary button with the strong gray of a control and draws no outline', () => {
        render(<Button variant="secondary">Cancelar</Button>);

        const button = screen.getByRole('button', { name: 'Cancelar' });

        expect(button).toHaveClass(
            'border-transparent',
            'bg-surface-control-active',
            'enabled:hover:bg-surface-control-hover',
        );
        expect(button).not.toHaveClass('border-border-strong');
    });

    it('underlines a link button under the pointer unless it is told not to', () => {
        render(
            <>
                <Button variant="link">Reintentar</Button>
                <Button underlined={false} variant="link">
                    Formatear
                </Button>
            </>,
        );

        expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveClass(
            'enabled:hover:underline',
        );
        expect(screen.getByRole('button', { name: 'Formatear' })).toHaveClass(
            'enabled:hover:no-underline',
        );
    });
});
