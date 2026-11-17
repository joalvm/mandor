import { envStore } from '@mandor/env';
import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceEnvironmentPicker } from '../../../src/renderer/environment/WorkspaceEnvironmentPicker.js';

const local = createEnvironment({ id: 'local', name: 'Local' });
const staging = createEnvironment({ id: 'staging', name: 'Staging' });

function show(): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <WorkspaceEnvironmentPicker />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
    vi.spyOn(window.mandor.environment, 'list').mockResolvedValue(success([local, staging]));
    vi.spyOn(window.mandor.environment, 'loadActive').mockResolvedValue(success({}));
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the environment of the sync window', () => {
    it('is the one the workspace has active, and choosing writes it there', async () => {
        const saveActive = vi
            .spyOn(window.mandor.environment, 'saveActive')
            .mockResolvedValue(success({}));

        show();
        fireEvent.pointerDown(await screen.findByRole('button', { name: /No environment/u }));
        const choice = await screen.findByRole('menuitem', { name: 'Staging' });

        // The choice writes when the bridge answers; the click lands whole inside act. The item is
        // found before: a search inside act turns act off while it waits.
        await act(() => {
            fireEvent.click(choice);

            return Promise.resolve();
        });

        expect(saveActive).toHaveBeenCalledWith({
            environmentId: staging.id,
            workspaceId: 'personal',
        });
    });
});
