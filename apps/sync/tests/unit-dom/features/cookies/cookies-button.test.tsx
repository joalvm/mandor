import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { CookiesButton } from '../../../../src/renderer/features/cookies/components/button/CookiesButton.js';
import { AppProviders } from '../../support/app-providers.js';

const staging = createEnvironment({ id: 'staging', name: 'Staging' });

beforeEach(() => {
    vi.restoreAllMocks();
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'demo' });
    vi.spyOn(window.mandor.environment, 'list').mockResolvedValue(success([staging]));
    vi.spyOn(window.mandor.environment, 'loadActive').mockResolvedValue(success({}));
    vi.spyOn(syncBridge.cookies, 'list').mockResolvedValue(success({ cookies: [] }));
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
    envStore.getState().reset();
});

describe('the button of the jar', () => {
    it('opens the jar of the workspace with no environment while none is active', async () => {
        render(<CookiesButton />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Cookies' }));

        await waitFor(() => {
            expect(syncBridge.cookies.list).toHaveBeenCalledWith({
                environmentId: null,
                workspaceId: 'demo',
            });
        });
    });

    it('opens the jar of the environment the workspace has active', async () => {
        envStore.setState({ activeEnvironmentIds: { demo: staging.id } });
        render(<CookiesButton />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Cookies' }));

        await waitFor(() => {
            expect(syncBridge.cookies.list).toHaveBeenCalledWith({
                environmentId: staging.id,
                workspaceId: 'demo',
            });
        });
    });

    it('reads nothing until it is opened, and closes with the way out of the dialog', async () => {
        render(<CookiesButton />, { wrapper: AppProviders });

        expect(syncBridge.cookies.list).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Cookies' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

    it('cannot be opened without a workspace', () => {
        shellStore.setState({ activeWorkspaceId: null });
        render(<CookiesButton />, { wrapper: AppProviders });

        expect(screen.getByRole('button', { name: 'Cookies' })).toBeDisabled();
    });
});
