import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../../src/components/button/Button.js';
import { Dialog } from '../../../src/components/dialog/Dialog.js';
import { DialogBody } from '../../../src/components/dialog/DialogBody.js';
import { DialogFooter } from '../../../src/components/dialog/DialogFooter.js';
import { DialogNav } from '../../../src/components/dialog/DialogNav.js';
import { TooltipProvider } from '../../../src/components/tooltip/TooltipProvider.js';
import { byPart } from '../../../src/testing/by-part.js';

function draw(onOpenChange = vi.fn()) {
    render(
        <TooltipProvider>
            <Dialog closeLabel="Cerrar" onOpenChange={onOpenChange} open title="Importar">
                <DialogBody>
                    <Button onClick={vi.fn()}>Elegir archivo</Button>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={vi.fn()} variant="primary">
                        Importar
                    </Button>
                </DialogFooter>
            </Dialog>
        </TooltipProvider>,
    );

    return onOpenChange;
}

describe('a dialog', () => {
    it('is announced by its title and describes nothing it does not show', () => {
        draw();

        const dialog = screen.getByRole('dialog', { name: 'Importar' });

        expect(dialog).toBeVisible();
        expect(dialog).not.toHaveAttribute('aria-describedby');
    });

    /**
     * The close button stands at the corner, but it is the last stop of the tab order: whoever
     * opened the dialog came for what is inside it, and the first key they press should land
     * there instead of on the way out.
     */
    it('starts the focus on what it holds and leaves the way out for last', async () => {
        draw();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Elegir archivo' })).toHaveFocus();
        });

        const dialog = screen.getByRole('dialog', { name: 'Importar' });

        expect(within(dialog).getAllByRole('button').at(-1)).toHaveAccessibleName('Cerrar');
    });

    it('closes from its corner button', () => {
        const onOpenChange = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('closes when Escape is pressed', () => {
        const onOpenChange = draw();

        fireEvent.keyDown(screen.getByRole('dialog', { name: 'Importar' }), { key: 'Escape' });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('lets a line give back what it held before Escape closes it', () => {
        const onOpenChange = draw();
        const line = screen.getByRole('button', { name: 'Elegir archivo' });

        line.focus();
        line.setAttribute('data-held', 'otro texto');
        fireEvent.keyDown(line, { key: 'Escape' });

        expect(onOpenChange).not.toHaveBeenCalled();

        line.removeAttribute('data-held');
        fireEvent.keyDown(line, { key: 'Escape' });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('lies on the scrim of the window and draws its title band, body and actions', () => {
        draw();

        const dialog = screen.getByRole('dialog', { name: 'Importar' });

        expect(dialog).toHaveAttribute('data-part', 'dialog');
        expect(byPart('dialog-scrim')).toContainElement(dialog);
        expect(byPart('dialog-header', dialog)).toHaveTextContent('Importar');
        expect(byPart('dialog-body', dialog)).toContainElement(
            screen.getByRole('button', { name: 'Elegir archivo' }),
        );
        expect(byPart('dialog-footer', dialog)).toContainElement(
            screen.getByRole('button', { name: 'Importar' }),
        );
    });

    it('keeps the column of sections inside the dialog it belongs to', () => {
        render(
            <TooltipProvider>
                <Dialog closeLabel="Cerrar" onOpenChange={vi.fn()} open title="Ajustes">
                    <DialogNav>
                        <Button onClick={vi.fn()}>General</Button>
                    </DialogNav>
                    <DialogBody>Contenido</DialogBody>
                </Dialog>
            </TooltipProvider>,
        );

        const dialog = screen.getByRole('dialog', { name: 'Ajustes' });

        expect(byPart('dialog-nav', dialog)).toContainElement(
            screen.getByRole('button', { name: 'General' }),
        );
    });
});
