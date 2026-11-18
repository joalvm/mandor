import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment } from '@mandor/schema';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { cleanup, act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ManagedEnvironments, envStore, openManagedEnvironments } from '../src/index.js';
import { closeManagedEnvironments, managedEnvironmentsStore } from '../src/managed-environments.js';

const environment = createEnvironment({ id: 'local', name: 'Local' });

function Wrapper({ children }: { children: React.ReactNode }) {
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
    envStore.getState().reset();
    envStore.setState({ environments: [environment] });
    managedEnvironmentsStore.setState({ environmentId: null, workspaceId: null });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    managedEnvironmentsStore.setState({ environmentId: null, workspaceId: null });
    envStore.getState().reset();
});

describe('the environments opened from anywhere', () => {
    it('draws nothing until something opens the dialog', () => {
        render(<ManagedEnvironments />, {
            wrapper: Wrapper,
        });

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens the dialog of the workspace, standing on the environment it was handed', () => {
        render(<ManagedEnvironments />, {
            wrapper: Wrapper,
        });
        act(() => {
            openManagedEnvironments('payments', environment.id);
        });

        expect(screen.getByRole('dialog')).toBeVisible();
        expect(screen.getByRole('option', { name: 'Local' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('closes from the dialog itself and leaves nothing behind', () => {
        render(<ManagedEnvironments />, {
            wrapper: Wrapper,
        });
        act(() => {
            openManagedEnvironments('payments', environment.id);
        });

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(managedEnvironmentsStore.getState().workspaceId).toBeNull();
    });

    it('clears with closeManagedEnvironments without touching the environments', () => {
        act(() => {
            openManagedEnvironments('payments', environment.id);
        });
        act(() => {
            closeManagedEnvironments();
        });

        expect(managedEnvironmentsStore.getState()).toEqual({
            environmentId: null,
            workspaceId: null,
        });
        expect(envStore.getState().environments).toEqual([environment]);
    });
});
