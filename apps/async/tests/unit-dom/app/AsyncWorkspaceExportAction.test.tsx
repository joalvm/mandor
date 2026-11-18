import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncWorkspaceExportAction } from '../../../src/renderer/app/AsyncWorkspaceExportAction.js';

import { AppProviders } from '../support/app-providers.js';

describe('the export of a workspace in Async (the button of the page of the workspaces)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.export, 'outline').mockResolvedValue(
            success({ name: 'Personal', nodes: [] }),
        );
    });

    it('reads the open workspace whole as an Mandor file and offers the other formats', async () => {
        render(<AsyncWorkspaceExportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Export a workspace' }));

        await waitFor(() => {
            expect(bridge.export.outline).toHaveBeenCalledWith({
                workspaceId: 'personal',
                format: 'mandor',
                scope: 'workspace',
            });
        });
        expect(await screen.findByRole('dialog')).toBeVisible();

        fireEvent.pointerDown(await screen.findByRole('button', { name: /^Format:/u }), {
            button: 0,
            ctrlKey: false,
        });

        expect(await screen.findByRole('menuitem', { name: 'Insomnia' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Bruno' })).toBeVisible();
    });
});
