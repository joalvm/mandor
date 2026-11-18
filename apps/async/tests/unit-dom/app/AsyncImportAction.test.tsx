import { success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncImportAction } from '../../../src/renderer/app/AsyncImportAction.js';

import { AppProviders } from '../support/app-providers.js';

const origin = { kind: 'asyncapi' as const, sourceId: 'abc' };

describe('the import action of Async (the icon of the collections)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local' });
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.import, 'pick').mockResolvedValue(
            success({ files: [{ path: 'pasarela.yaml', text: 'asyncapi: 3.0.0' }] }),
        );
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(
            success({
                name: 'Pasarela',
                plan: {
                    identity: origin,
                    entries: [
                        {
                            class: 'add',
                            place: 'folder',
                            route: 'pedidos',
                            name: 'pedidos',
                            resource: {
                                place: 'folder',
                                itemKind: null,
                                route: 'pedidos',
                                name: 'pedidos',
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
    });

    it('reads AsyncAPI, says so in its own words and reloads the collection it wrote', async () => {
        render(<AsyncImportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));

        expect(screen.getByRole('listitem')).toHaveTextContent(
            'AsyncAPI 2.x or 3.x, as JSON or YAML',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
        await screen.findByRole('tree');

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: [{ path: 'pasarela.yaml', text: 'asyncapi: 3.0.0' }],
            scope: 'collection',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Import' }));

        await waitFor(() => {
            expect(bridge.collections.tree).toHaveBeenCalledWith({ workspaceId: 'personal' });
        });

        // The collections are the confirmation: no tab opens to report the import.
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('offers one format only, so the dialog asks for none', () => {
        render(<AsyncImportAction />, { wrapper: AppProviders });

        fireEvent.click(screen.getByRole('button', { name: 'Import a document' }));

        expect(screen.queryByRole('combobox', { name: 'Format' })).toBeNull();
    });
});
