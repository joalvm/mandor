import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envStore, WorkspaceAuthAction } from '../src/index.js';

const AFTER_DEBOUNCE = 400;

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

beforeEach(() => {
    vi.useFakeTimers();
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'payments' });
});

afterEach(() => {
    // The window goes first: resetting state under a mounted tree is an update outside act.
    cleanup();

    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('the auth action of the workspace panel', () => {
    it('opens the dialog of the auth from one button', async () => {
        render(<WorkspaceAuthAction placements={['header', 'query', 'cookie']} />, {
            wrapper: Wrapper,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Authentication' }));

        await act(() => vi.advanceTimersByTimeAsync(50));

        expect(screen.getByRole('dialog', { name: 'Authentication' })).toBeVisible();
    });

    it('writes what the editor changed through the auth of the bridge', async () => {
        const write = vi.spyOn(bridge.auth, 'write').mockResolvedValue(success({}));

        render(<WorkspaceAuthAction placements={['header', 'query', 'cookie']} />, {
            wrapper: Wrapper,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Authentication' }));

        await act(() => vi.advanceTimersByTimeAsync(50));

        const dialog = screen.getByRole('dialog', { name: 'Authentication' });

        fireEvent.keyDown(within(dialog).getByRole('combobox', { name: 'Type' }), {
            key: 'ArrowDown',
        });

        await act(() => vi.advanceTimersByTimeAsync(0));

        const listbox = screen.getByRole('listbox');

        fireEvent.click(within(listbox).getByRole('option', { name: 'Basic' }));

        const username = within(dialog).getByRole('textbox', { name: 'Username' });

        username.textContent = 'ana';
        fireEvent.input(username);

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'payments',
            auth: { type: 'basic', username: 'ana', password: '' },
        });
    });
});
