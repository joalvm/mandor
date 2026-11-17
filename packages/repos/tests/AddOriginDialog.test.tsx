import { MessagesProvider } from '@mandor/i18n';
import type { FakeBridge } from '@mandor/ipc/testing';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { AddOriginDialog } from '../src/components/dialog/AddOriginDialog.js';

const fakeBridge = bridge as FakeBridge;

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count: number) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

/** The inputs are contenteditable: typing is setting the text and letting the input event fly. */
function type(label: string, value: string): void {
    const box = screen.getByRole('textbox', { name: label });

    box.textContent = value;
    fireEvent.input(box);
}

function dialog(onAdded = vi.fn()): ReturnType<typeof vi.fn> {
    render(<AddOriginDialog onAdded={onAdded} onClose={vi.fn()} />, { wrapper: Wrapper });

    return onAdded;
}

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('the add origin dialog', () => {
    it('keeps the add waiting until both fields hold something', () => {
        dialog();

        expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    });

    it('refuses an address that cannot name an origin without calling main', async () => {
        const added = vi.spyOn(fakeBridge.origin, 'add');

        dialog();
        type('Name', 'Ghost');
        type('Address', 'not a url');
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));

        await waitFor(() => {
            expect(screen.getByText('That is not an address Mandor can use.')).toBeVisible();
        });
        expect(added).not.toHaveBeenCalled();
    });

    it('hands the origin over when both fields are filled', async () => {
        const onAdded = dialog();

        type('Name', 'Mirror');
        type('Address', 'https://github.com/team/mirror.git');
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));

        await waitFor(() => {
            expect(onAdded).toHaveBeenCalled();
        });
    });
});
