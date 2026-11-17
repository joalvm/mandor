import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
    Button,
    ConfirmDialog,
    Dialog,
    DialogBody,
    Popover,
    PopoverPanel,
    PopoverTrigger,
    Tooltip,
    TooltipProvider,
} from '../../src/index.js';

describe('the floating surface primitives', () => {
    it('opens textual tooltips from their trigger', async () => {
        render(
            <TooltipProvider delayDuration={0}>
                <Tooltip content="Buscar recursos">
                    <button type="button">Buscar</button>
                </Tooltip>
            </TooltipProvider>,
        );

        fireEvent.focus(screen.getByRole('button', { name: 'Buscar' }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Buscar recursos');
    });

    it('opens a labeled popover', async () => {
        render(
            <Popover>
                <PopoverTrigger>
                    <Button>Crear</Button>
                </PopoverTrigger>
                <PopoverPanel label="Crear workspace">
                    <div>Formulario</div>
                </PopoverPanel>
            </Popover>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

        expect(await screen.findByRole('dialog', { name: 'Crear workspace' })).toBeVisible();
    });

    it('anchors a hover panel on a virtual rect without taking the focus', async () => {
        const anchor = {
            current: { getBoundingClientRect: () => new DOMRect(10, 10, 60, 16) },
        };

        render(
            <Popover anchor={anchor} modal={false} open>
                <PopoverPanel autofocus={false} label="base_url">
                    <div>Contenido</div>
                </PopoverPanel>
            </Popover>,
        );

        expect(await screen.findByRole('dialog', { name: 'base_url' })).toBeVisible();
        expect(document.activeElement).not.toBeNull();
    });

    it('labels a dialog from its exact title', () => {
        render(
            <TooltipProvider>
                <Dialog open title="Aviso de seguridad" closeLabel="Cerrar" onOpenChange={vi.fn()}>
                    <DialogBody>Contenido</DialogBody>
                </Dialog>
            </TooltipProvider>,
        );

        expect(screen.getByRole('dialog', { name: 'Aviso de seguridad' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Cerrar' }).querySelector('svg')).toHaveAttribute(
            'width',
            '16',
        );
    });

    it('focuses the safe action in a confirmation', async () => {
        render(
            <ConfirmDialog
                open
                title="Borrar la conexión gateway"
                description="Se pierde su configuración"
                cancelLabel="Conservar"
                confirmLabel="Borrar"
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
                onOpenChange={vi.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Conservar' })).toHaveFocus();
        });
    });

    /**
     * The sweep grace is the library's to keep: once a tooltip has shown, the next trigger
     * under the pointer shows its own at once, so crossing a toolbar does not pay the delay
     * per button. jsdom cannot carry the pointer geometry to test it as behaviour, so the
     * guard watches the prop itself: handing 0 to the provider is what switches the grace off.
     */
    it('keeps the library grace between the tooltips of a sweep', async () => {
        const source = await readFile(
            join(
                process.cwd(),
                'packages',
                'ui',
                'src',
                'components',
                'tooltip',
                'TooltipProvider.tsx',
            ),
            'utf8',
        );

        expect(source).not.toContain('skipDelayDuration');
    });

    it('asks for the name again when a confirmation closed without an answer', () => {
        const props = {
            cancelLabel: 'Conservar',
            confirmLabel: 'Borrar',
            confirmationName: 'gateway-local',
            description: 'Se pierde su configuración',
            onCancel: vi.fn(),
            onConfirm: vi.fn(),
            onOpenChange: vi.fn(),
            title: 'Borrar la conexión gateway-local',
        };
        const harness = render(<ConfirmDialog open {...props} />);

        const typed = screen.getByRole('textbox', { name: 'gateway-local' });

        typed.textContent = 'gateway-local';
        fireEvent.input(typed);
        expect(screen.getByRole('button', { name: 'Borrar' })).toBeEnabled();

        harness.rerender(<ConfirmDialog open={false} {...props} />);
        harness.rerender(<ConfirmDialog open {...props} />);

        const fresh = screen.getByRole('textbox', { name: 'gateway-local' });

        expect(fresh).toHaveTextContent('');
        expect(fresh.childNodes.length).toBe(0);
        expect(screen.getByRole('button', { name: 'Borrar' })).toBeDisabled();
    });
});
