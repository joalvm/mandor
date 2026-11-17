import { success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncImportAction } from '../../../src/renderer/app/SyncImportAction.js';

import { AppProviders } from '../support/app-providers.js';

const origin = { kind: 'openapi' as const, sourceId: 'abc' };

describe('the import action of Sync (the icon of the collections)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local' });
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(
            success({ files: [{ path: 'pets.yaml', text: 'openapi: 3.1.0' }] }),
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
            success({ applied: 1, workspaceId: 'personal' }),
        );
        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));
        vi.spyOn(bridge.environment, 'list').mockResolvedValue(success([]));
    });

    it('lists the five formats it reads, sends the text alone and reloads the collection it wrote', async () => {
        render(<SyncImportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'OpenAPI 3.x or Swagger 2.0, as JSON or YAML',
            'Postman v2.1 collection, in JSON',
            'Insomnia v4 or v5 export, in JSON or YAML',
            'Bruno a folder of a collection, in OpenCollection YAML or .bru files',
            'HAR 1.2 recorded by a browser, in JSON',
        ]);

        // Bruno lives in a folder, so the dropzone offers that dialog beside the one of files.
        expect(screen.getByRole('button', { name: 'Choose folder' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('tree');

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: [{ path: 'pets.yaml', text: 'openapi: 3.1.0' }],
            scope: 'collection',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Import' }));

        await waitFor(() => {
            expect(bridge.collections.tree).toHaveBeenCalledWith({ workspaceId: 'personal' });
        });
        // A document may bring environments, and a workspace just made has not read its own yet.
        await waitFor(() => {
            expect(bridge.environment.list).toHaveBeenCalledWith({ workspaceId: 'personal' });
        });

        // The collections are the confirmation: no tab opens to report the import.
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });
});
