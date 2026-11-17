import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envStore, ManageEnvironmentsButton } from '../src/index.js';
import { managedEnvironmentsStore } from '../src/managed-environments.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

const PROD = { id: 'prod', name: 'Prod', variables: [] };

beforeEach(() => {
    vi.restoreAllMocks();
    envStore.getState().reset();
    shellStore.getState().reset();
    managedEnvironmentsStore.setState({ environmentId: null, workspaceId: null });
    vi.spyOn(bridge.environment, 'list').mockResolvedValue(success([PROD]));
});

afterEach(() => {
    envStore.getState().reset();
});

describe('the door to the environments of the workspace', () => {
    /** Mandor Realtime reads them nowhere else before a connection is open: none would show. */
    it('brings in the environments of the workspace as soon as the window is on one', async () => {
        shellStore.setState({ activeWorkspaceId: 'payments' });
        render(<ManageEnvironmentsButton />, { wrapper: Wrapper });

        await waitFor(() => {
            expect(envStore.getState().environments).toEqual([PROD]);
        });
    });

    it('opens the environments of the workspace the window is on', async () => {
        shellStore.setState({ activeWorkspaceId: 'payments' });
        render(<ManageEnvironmentsButton />, { wrapper: Wrapper });
        await waitFor(() => {
            expect(envStore.getState().environments).toEqual([PROD]);
        });

        fireEvent.click(screen.getByRole('button', { name: 'Manage environments' }));

        expect(managedEnvironmentsStore.getState()).toEqual({
            environmentId: null,
            workspaceId: 'payments',
        });
    });

    it('stands disabled while no workspace is open', () => {
        render(<ManageEnvironmentsButton />, { wrapper: Wrapper });

        expect(screen.getByRole('button', { name: 'Manage environments' })).toBeDisabled();
    });
});
