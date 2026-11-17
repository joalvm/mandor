import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { workspacesStore } from '@mandor/workspace';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncWorkspaceImportAction } from '../../../src/renderer/app/SyncWorkspaceImportAction.js';

import { AppProviders } from '../support/app-providers.js';

const origin = { kind: 'mandor' as const, sourceId: 'abc' };
const PETS = { id: 'pets', kind: 'sync', name: 'Pets', modifiedAt: null } as const;

describe('the import of a workspace in Sync (the button of the list of workspaces)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        workspacesStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local' });
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(
            success({ files: [{ path: 'pets.mandor.yaml', text: 'mandor: workspace' }] }),
        );
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            success({
                name: 'Pets',
                plan: {
                    identity: origin,
                    entries: [
                        {
                            class: 'add',
                            place: 'folder',
                            route: 'pets',
                            name: 'pets',
                            resource: {
                                place: 'folder',
                                itemKind: null,
                                route: 'pets',
                                name: 'pets',
                                fields: {},
                                origin,
                                degradations: [],
                            },
                            selected: true,
                        },
                    ],
                },
            }),
        );
        vi.spyOn(bridge.import, 'apply').mockResolvedValue(
            success({ applied: 1, workspaceId: 'pets' }),
        );
        vi.spyOn(bridge.workspace, 'list').mockResolvedValue(success([PETS]));
    });

    it('reads Mandor, Postman, Insomnia and Bruno, asks for a new workspace and opens the one it made', async () => {
        render(<SyncWorkspaceImportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Import a workspace' }));

        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'Mandor A workspace of Mandor Request, in YAML',
            'Postman v2.1 collections, with their environments and globals, in JSON',
            'Insomnia v4 or v5 export, in JSON or YAML',
            'Bruno folders of collections, in OpenCollection YAML or .bru files, with their environments',
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('tree');

        // No workspace is open and none is needed: the plan has nothing to compare with.
        expect(bridge.import.plan).toHaveBeenCalledWith({
            files: [{ path: 'pets.mandor.yaml', text: 'mandor: workspace' }],
            scope: 'workspace',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Import' }));

        await waitFor(() => {
            expect(shellStore.getState().activeWorkspaceId).toBe('pets');
        });

        expect(bridge.import.apply).toHaveBeenCalledWith(
            expect.objectContaining({ target: { newWorkspace: 'Pets' } }),
        );
        expect(workspacesStore.getState().workspaces).toEqual([PETS]);
    });
});
