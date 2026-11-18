import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '../../../src/components/dialog/ConfirmDialog.js';

type Handlers = { onCancel: () => void; onConfirm: () => void; onOpenChange: () => void };

function draw(confirmationName?: string): Handlers {
    const handlers = { onCancel: vi.fn(), onConfirm: vi.fn(), onOpenChange: vi.fn() };

    render(
        <ConfirmDialog
            cancelLabel="Conservar"
            confirmLabel="Vaciar"
            confirmationName={confirmationName}
            description="Se borra todo lo que contiene. No se puede deshacer."
            open
            title="Vaciar el origen Trabajo"
            {...handlers}
        />,
    );

    return handlers;
}

function typeInto(name: string, value: string): void {
    const field = screen.getByRole('textbox', { name });

    field.textContent = value;
    fireEvent.input(field);
}

describe('a confirmation', () => {
    it('is announced by what it destroys and described by what is lost', () => {
        draw();

        expect(
            screen.getByRole('alertdialog', {
                description: 'Se borra todo lo que contiene. No se puede deshacer.',
                name: 'Vaciar el origen Trabajo',
            }),
        ).toBeVisible();
    });

    it('starts the focus on the safe way out', async () => {
        draw();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Conservar' })).toHaveFocus();
        });
    });

    it('offers the two answers and no third way out', () => {
        draw();

        const names = screen.getAllByRole('button').map((button) => button.textContent);

        expect(names).toEqual(['Conservar', 'Vaciar']);
    });

    /**
     * The red of the window says what already happened, with one exception: the verb that is
     * about to destroy something, where the colour has to make the reader stop. Its safe
     * alternative stays quiet, and holds the focus.
     */
    it('paints the verb of the irreversible act red, and the way back quiet', () => {
        draw();

        expect(screen.getByRole('button', { name: 'Vaciar' })).toHaveAttribute(
            'data-variant',
            'danger',
        );
        expect(screen.getByRole('button', { name: 'Conservar' })).toHaveAttribute(
            'data-variant',
            'secondary',
        );
    });

    it('runs the action from its verb', () => {
        const handlers = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }));

        expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('keeps the verb locked until the name of what is destroyed is typed by hand', () => {
        const handlers = draw('Trabajo');
        const confirm = screen.getByRole('button', { name: 'Vaciar' });

        expect(confirm).toBeDisabled();

        typeInto('Trabajo', 'Trabaj');

        expect(confirm).toBeDisabled();

        typeInto('Trabajo', 'Trabajo');
        fireEvent.click(confirm);

        expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('asks for the name again when it comes back, whatever was half typed before', () => {
        const props = {
            cancelLabel: 'Conservar',
            confirmLabel: 'Vaciar',
            confirmationName: 'Trabajo',
            description: 'Se borra todo lo que contiene.',
            onCancel: vi.fn(),
            onConfirm: vi.fn(),
            onOpenChange: vi.fn(),
            title: 'Vaciar el origen Trabajo',
        };
        const { rerender } = render(<ConfirmDialog {...props} open />);

        typeInto('Trabajo', 'Trabajo');
        rerender(<ConfirmDialog {...props} open={false} />);
        rerender(<ConfirmDialog {...props} open />);

        expect(screen.getByRole('textbox', { name: 'Trabajo' })).toHaveTextContent('');
        expect(screen.getByRole('button', { name: 'Vaciar' })).toBeDisabled();
    });
});
