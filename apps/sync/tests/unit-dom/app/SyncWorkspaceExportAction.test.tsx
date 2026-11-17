import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncWorkspaceExportAction } from '../../../src/renderer/app/SyncWorkspaceExportAction.js';

import { AppProviders } from '../support/app-providers.js';

describe('the export of a workspace in Sync (the button of the page of the workspaces)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.export, 'outline').mockResolvedValue(
            success({ name: 'Personal', nodes: [] }),
        );
    });

    it('reads the open workspace whole as an Mandor file and names the format in the dialog', async () => {
        render(<SyncWorkspaceExportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Export a workspace' }));

        await waitFor(() => {
            expect(bridge.export.outline).toHaveBeenCalledWith({
                workspaceId: 'personal',
                format: 'mandor',
                scope: 'workspace',
            });
        });
        expect(await screen.findByRole('button', { name: 'Format: Mandor' })).toBeVisible();
    });

    it.each([
        ['Postman', 'postman'],
        ['Insomnia', 'insomnia'],
        ['Bruno', 'bruno'],
    ])('reads the workspace again as %s when the user picks it', async (label, format) => {
        render(<SyncWorkspaceExportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Export a workspace' }));
        fireEvent.pointerDown(await screen.findByRole('button', { name: 'Format: Mandor' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: label }));

        await waitFor(() => {
            expect(bridge.export.outline).toHaveBeenLastCalledWith({
                workspaceId: 'personal',
                format,
                scope: 'workspace',
            });
        });
        expect(await screen.findByRole('button', { name: `Format: ${label}` })).toBeVisible();
    });
});
