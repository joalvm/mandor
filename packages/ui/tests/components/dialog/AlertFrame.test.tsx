import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AlertDialog } from 'radix-ui';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AlertFrame } from '../../../src/components/dialog/AlertFrame.js';
import { byPart } from '../../../src/testing/by-part.js';

function draw(onOpenChange: (open: boolean) => void): void {
    render(
        <AlertFrame onOpenChange={onOpenChange} open title="¿Borrar «Login»?">
            <AlertDialog.Description>No se puede deshacer.</AlertDialog.Description>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
        </AlertFrame>,
    );
}

/** The way the dialogs of the window open it: a state in the parent and no trigger inside. */
function Asker() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => {
                    setOpen(true);
                }}
                type="button"
            >
                Borrar
            </button>
            <AlertFrame onOpenChange={setOpen} open={open} title="¿Borrar «Login»?">
                <AlertDialog.Description>No se puede deshacer.</AlertDialog.Description>
                <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            </AlertFrame>
        </>
    );
}

describe('the frame of a dialog that asks (AlertFrame)', () => {
    it('names the question and holds what the dialog puts inside it', () => {
        draw(vi.fn());

        expect(
            screen.getByRole('alertdialog', {
                description: 'No se puede deshacer.',
                name: '¿Borrar «Login»?',
            }),
        ).toHaveAttribute('data-part', 'dialog');
    });

    it('is left only by an answer, never by a click outside', () => {
        const onOpenChange = vi.fn();

        draw(onOpenChange);
        fireEvent.pointerDown(byPart('dialog-scrim'));

        expect(onOpenChange).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    /** No trigger opens it, so the answer has to remember who asked: the keyboard goes on from there. */
    it('gives the focus back to what had it when the question opened', async () => {
        render(<Asker />);

        const opener = screen.getByRole('button', { name: 'Borrar' });

        opener.focus();
        fireEvent.click(opener);
        fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

        await waitFor(() => {
            expect(opener).toHaveFocus();
        });
    });
});
