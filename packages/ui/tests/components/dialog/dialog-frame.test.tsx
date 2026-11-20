import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '../../../src/components/dialog/ConfirmDialog.js';
import { Dialog } from '../../../src/components/dialog/Dialog.js';
import { DialogBody } from '../../../src/components/dialog/DialogBody.js';
import { TooltipProvider } from '../../../src/components/tooltip/TooltipProvider.js';
import { byPart } from '../../../src/testing/by-part.js';

/** The parts `runtime.css` lays out and moves, and `dialog-frame.ts` paints, in either dialog. */
function expectFrame(surface: HTMLElement, title: string): void {
    expect(surface).toHaveAttribute('data-part', 'dialog');
    expect(byPart('dialog-scrim')).toContainElement(surface);
    expect(byPart('dialog-header', surface)).toContainElement(
        screen.getByRole('heading', { name: title }),
    );
}

/**
 * A question and a form are two behaviours of one object. What a reader sees first —the scrim
 * under it, the cut of the surface, the band its title sits in— is written once and worn by both,
 * so a confirmation can never drift into a look of its own.
 */
describe('the frame every modal of the window is drawn in', () => {
    it('cuts a dialog from the frame, on the scrim of the window', () => {
        render(
            <TooltipProvider>
                <Dialog closeLabel="Cerrar" onOpenChange={vi.fn()} open title="Entornos">
                    <DialogBody>Contenido</DialogBody>
                </Dialog>
            </TooltipProvider>,
        );

        expectFrame(screen.getByRole('dialog', { name: 'Entornos' }), 'Entornos');
    });

    it('rounds the surface like everything that floats over the window', () => {
        render(
            <TooltipProvider>
                <Dialog closeLabel="Cerrar" onOpenChange={vi.fn()} open title="Entornos">
                    <DialogBody>Contenido</DialogBody>
                </Dialog>
            </TooltipProvider>,
        );

        const surface = screen.getByRole('dialog', { name: 'Entornos' });

        expect(surface).toHaveClass('rounded-overlay', 'bg-surface-dialog');
        expect(surface).not.toHaveClass('rounded-xl');
    });

    it('cuts a confirmation from the same frame, with the same three bands', () => {
        render(
            <ConfirmDialog
                cancelLabel="Conservar"
                confirmLabel="Borrar"
                description="No se puede deshacer."
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
                onOpenChange={vi.fn()}
                open
                title="Borrar el entorno Local"
            />,
        );

        const confirmation = screen.getByRole('alertdialog', { name: 'Borrar el entorno Local' });

        expectFrame(confirmation, 'Borrar el entorno Local');
        expect(byPart('dialog-body', confirmation)).toHaveTextContent('No se puede deshacer.');
        expect(byPart('dialog-footer', confirmation)).toContainElement(
            screen.getByRole('button', { name: 'Borrar' }),
        );
    });
});
