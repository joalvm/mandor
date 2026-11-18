import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SaveChangesDialog } from '../../../src/components/dialog/SaveChangesDialog.js';

type Handlers = { onCancel: () => void; onDiscard: () => void; onSave?: () => void };

function draw(handlers: Handlers, saving = false): void {
    render(
        <SaveChangesDialog
            cancelLabel="Cancelar"
            description="Si no los guardas, se pierden."
            discardLabel="No guardar"
            open
            saveLabel="Guardar"
            saving={saving}
            title="¿Guardar los cambios de «Login»?"
            {...handlers}
        />,
    );
}

function handlers(): Required<Handlers> {
    return { onCancel: vi.fn(), onDiscard: vi.fn(), onSave: vi.fn() };
}

describe('the question about unsaved work', () => {
    it('is announced by what holds the work and says what is lost', () => {
        draw(handlers());

        expect(
            screen.getByRole('alertdialog', {
                description: 'Si no los guardas, se pierden.',
                name: '¿Guardar los cambios de «Login»?',
            }),
        ).toBeVisible();
    });

    it('offers to let go, to stay, and to save, and starts the focus on staying', async () => {
        draw(handlers());

        const names = screen.getAllByRole('button').map((button) => button.textContent);

        expect(names).toEqual(['No guardar', 'Cancelar', 'Guardar']);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
        });
    });

    it('hands each answer to its own handler', () => {
        const told = handlers();

        draw(told);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        fireEvent.click(screen.getByRole('button', { name: 'No guardar' }));

        expect(told.onSave).toHaveBeenCalledOnce();
        expect(told.onDiscard).toHaveBeenCalledOnce();
    });

    it('stays when Escape is pressed', () => {
        const told = handlers();

        draw(told);
        fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

        expect(told.onCancel).toHaveBeenCalledOnce();
    });

    it('offers no save when the work has nowhere to go', () => {
        draw({ onCancel: vi.fn(), onDiscard: vi.fn() });

        expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    });

    it('takes no answer while the save is under way', () => {
        const told = handlers();

        draw(told, true);
        fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

        expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
        expect(told.onCancel).not.toHaveBeenCalled();
    });
});
