import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EntryLineRow } from '../src/components/entry/EntryLineRow.js';

afterEach(cleanup);

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the row of one entry', () => {
    it('carries the way in, the way out and the way out of the list', () => {
        draw(
            <EntryLineRow
                environment={undefined}
                invalid={false}
                line={{ disabled: false, id: '0', name: 'Authorization', value: 'token' }}
                onEdit={() => undefined}
                onRemove={() => undefined}
                onVariablesChange={() => undefined}
            />,
        );

        expect(screen.getByRole('checkbox', { name: 'Enviar esta entrada' })).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Valor' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Quitar entrada' })).toBeVisible();
    });

    it('writes each part the row edits, and the way out of the list', () => {
        const edit = vi.fn();
        const remove = vi.fn();

        draw(
            <EntryLineRow
                environment={undefined}
                invalid={false}
                line={{ disabled: false, id: '0', name: 'Authorization', value: 'token' }}
                onEdit={edit}
                onRemove={remove}
                onVariablesChange={() => undefined}
            />,
        );

        fireEvent.click(screen.getByRole('checkbox', { name: 'Enviar esta entrada' }));
        expect(edit).toHaveBeenLastCalledWith({ disabled: true });

        fireEvent.input(screen.getByRole('textbox', { name: 'Nombre' }), {
            target: { textContent: 'X-Tag' },
        });
        expect(edit).toHaveBeenLastCalledWith({ name: 'X-Tag' });

        fireEvent.click(screen.getByRole('button', { name: 'Quitar entrada' }));
        expect(remove).toHaveBeenCalledOnce();
    });
});
