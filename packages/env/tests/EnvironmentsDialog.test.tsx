import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { cleanup, act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { EnvironmentsDialog, envStore } from '../src/index.js';

const AFTER_DEBOUNCE = 1000;
const environment = createEnvironment({ id: 'local', name: 'Local' });

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

function open(environmentId: string | null = null): void {
    render(
        <EnvironmentsDialog
            environmentId={environmentId}
            onOpenChange={vi.fn()}
            open
            workspaceId="payments"
        />,
        {
            wrapper: Wrapper,
        },
    );
}

function type(label: string, value: string): void {
    const input = screen.getByRole('textbox', { name: label });

    input.textContent = value;
    fireEvent.input(input);
}

/** The first line with that label: the row on screen stands before the empty one. */
function typeFirst(label: string, value: string): void {
    const input = screen.getAllByRole('textbox', { name: label })[0];

    if (input === undefined) {
        throw new Error(`no line named ${label}`);
    }

    input.textContent = value;
    fireEvent.input(input);
}

beforeEach(() => {
    vi.useFakeTimers();
    envStore.getState().reset();
    envStore.setState({ environments: [environment] });
    vi.spyOn(bridge.environment, 'create');
    vi.spyOn(bridge.environment, 'delete');
    vi.spyOn(bridge.environment, 'update').mockImplementation(({ changes }) =>
        Promise.resolve(
            success(
                createEnvironment({ id: 'local', name: changes.name ?? 'Local', variables: [] }),
            ),
        ),
    );
    vi.spyOn(bridge.environment, 'list').mockResolvedValue(success([environment]));
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('the environments dialog', () => {
    it('creates an environment from the foot of the list', async () => {
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Create environment' }));

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(bridge.environment.create).toHaveBeenCalledWith({
            workspaceId: 'payments',
            name: 'Local',
        });
    });

    it('renames the environment on screen after typing stops', async () => {
        open();
        type('Environment name', 'Staging');

        expect(bridge.environment.update).not.toHaveBeenCalled();

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(bridge.environment.update).toHaveBeenCalledWith({
            workspaceId: 'payments',
            environmentId: 'local',
            changes: { name: 'Staging', variables: [] },
        });
    });

    it('adds a variable to the environment on screen, born from the empty last row', async () => {
        open();
        type('Key', 'host');
        typeFirst('Value', '127.0.0.1:8080');

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(bridge.environment.update).toHaveBeenCalledWith({
            workspaceId: 'payments',
            environmentId: 'local',
            changes: {
                name: 'Local',
                variables: [
                    { name: 'host', value: '127.0.0.1:8080', enabled: true, secret: false },
                ],
            },
        });
    });

    /**
     * The door out of an environment lives in its own row of the column. Taking one the cursor
     * is not standing on leaves the cursor where it was: only the row leaves.
     */
    it('deletes another environment from its cross, and the one on screen stays', async () => {
        envStore.setState({
            environments: [environment, createEnvironment({ id: 'staging', name: 'Staging' })],
        });
        open();

        const staging = within(screen.getByRole('option', { name: 'Staging' }));

        fireEvent.click(staging.getByRole('button', { name: 'Delete environment' }));

        expect(bridge.environment.delete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(bridge.environment.delete).toHaveBeenCalledWith({
            workspaceId: 'payments',
            environmentId: 'staging',
        });
        expect(screen.getByRole('option', { name: 'Local' })).toHaveAttribute(
            'aria-selected',
            'true',
        );

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));
    });

    /**
     * The dialog may be opened on an environment another window already deleted. The list then
     * still has one open —the first— so its detail is on screen and the tab key can reach it.
     */
    it('opens the first environment when the one it was asked for is gone', () => {
        open('deleted-elsewhere');

        expect(screen.getByRole('option', { name: 'Local' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByRole('textbox', { name: 'Environment name' })).toBeVisible();
    });

    it('deletes an environment only once the confirmation is accepted', async () => {
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Delete environment' }));

        expect(bridge.environment.delete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(bridge.environment.delete).toHaveBeenCalledWith({
            workspaceId: 'payments',
            environmentId: 'local',
        });
    });
});
