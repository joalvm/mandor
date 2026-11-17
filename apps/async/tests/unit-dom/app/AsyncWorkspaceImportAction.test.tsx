import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { workspacesStore } from '@mandor/workspace';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncWorkspaceImportAction } from '../../../src/renderer/app/AsyncWorkspaceImportAction.js';

import { AppProviders } from '../support/app-providers.js';

const origin = { kind: 'mandor' as const, sourceId: 'abc' };
const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;

describe('the import of a workspace in Async (the button of the list of workspaces)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        workspacesStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local' });
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(
            success({ files: [{ path: 'events.mandor.yaml', text: 'mandor: workspace' }] }),
        );
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            success({
                name: 'Events',
                plan: {
                    identity: origin,
                    entries: [
                        {
                            class: 'add',
                            place: 'folder',
                            route: 'events',
                            name: 'events',
                            resource: {
                                place: 'folder',
                                itemKind: null,
                                route: 'events',
                                name: 'events',
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
            success({ applied: 1, workspaceId: 'events' }),
        );
        vi.spyOn(bridge.workspace, 'list').mockResolvedValue(success([EVENTS]));
    });

    it('reads the Mandor format alone, asks for a new workspace and opens the one it made', async () => {
        render(<AsyncWorkspaceImportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Import a workspace' }));

        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'Mandor A workspace of Mandor Realtime, in YAML',
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('tree');
        fireEvent.click(screen.getByRole('button', { name: 'Import' }));

        await waitFor(() => {
            expect(shellStore.getState().activeWorkspaceId).toBe('events');
        });

        expect(bridge.import.apply).toHaveBeenCalledWith(
            expect.objectContaining({ target: { newWorkspace: 'Events' } }),
        );
        expect(workspacesStore.getState().workspaces).toEqual([EVENTS]);
    });
});
