import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { NewWorkspaceDialog } from '../src/components/dialog/NewWorkspaceDialog.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('the new workspace dialog', () => {
    it('creates only when a name has something to show', async () => {
        const create = vi.spyOn(bridge.workspace, 'create');
        const onCreated = vi.fn();

        render(<NewWorkspaceDialog onClose={vi.fn()} onCreated={onCreated} />, {
            wrapper: Wrapper,
        });

        const field = screen.getByRole('textbox', { name: 'Workspace name' });

        expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
        field.textContent = 'Events';
        fireEvent.input(field);
        await act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Create' }));

            return Promise.resolve();
        });

        await vi.waitFor(() => {
            expect(create).toHaveBeenCalledWith({ name: 'Events' });
        });
    });

    it('hands back what main answered and closes through its caller', async () => {
        const onCreated = vi.fn();
        const onClose = vi.fn();

        render(<NewWorkspaceDialog onClose={onClose} onCreated={onCreated} />, {
            wrapper: Wrapper,
        });

        const field = screen.getByRole('textbox', { name: 'Workspace name' });

        field.textContent = 'Events';
        fireEvent.input(field);
        await act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Create' }));

            return Promise.resolve();
        });

        await vi.waitFor(() => {
            expect(onCreated).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'events', name: 'Events' }),
            );
        });
        expect(onClose).not.toHaveBeenCalled();
    });
});
