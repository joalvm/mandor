import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import type { FolderChainLevel, FolderChainSettings, RequestScripts } from '@mandor/schema';
import { bridge, settlePendingWrites, shellStore, TabProvider } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FolderScripts } from '../../../../src/renderer/features/requests/components/folder/FolderScripts.js';
import { AppProviders } from '../../support/app-providers.js';

const TAB = { resource: 'mandor://local/local/folder/pedidos/altas', tabId: 'folder-1' };

function chainOf(
    scripts?: RequestScripts,
    level: FolderChainLevel['level'] = 'folder',
    more: FolderChainSettings = {},
): FolderChainLevel[] {
    return [
        {
            level,
            place: { kind: 'folder', path: 'pedidos/altas' },
            name: 'Altas',
            settings: { ...(scripts === undefined ? {} : { scripts }), ...more },
        },
        { level: 'workspace', place: { kind: 'workspace' }, name: 'Personal', settings: {} },
    ];
}

async function show(chain: FolderChainLevel[]): Promise<void> {
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chain));
    render(
        <TabProvider value={TAB}>
            <FolderScripts />
        </TabProvider>,
        { wrapper: AppProviders },
    );
    await screen.findByRole('tab', { name: 'Before the request' });
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    envStore.setState({ folderChains: {} });
});

afterEach(async () => {
    await settlePendingWrites();
    cleanup();
    shellStore.getState().reset();
    vi.restoreAllMocks();
});

describe('the scripts of a collection or a folder, in its tab', () => {
    it('shows the script the first level of the chain declares', async () => {
        await show(chainOf({ onBeforeRequest: { source: 'b()' } }));

        expect((await editorAt(0)).text()).toBe('b()');
    });

    it('writes what was typed through the patch of the settings, after the pause', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        await show(chainOf());
        (await editorAt(0)).typeOver('a()');

        expect(write).not.toHaveBeenCalled();

        await act(() => settlePendingWrites());

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'local',
            path: 'pedidos/altas',
            patch: { scripts: { onBeforeRequest: { source: 'a()' } } },
        });
    });

    it('takes the scripts out of the file once the last one is emptied', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        await show(chainOf({ onBeforeRequest: { source: 'a()' } }));
        (await editorAt(0)).typeOver('');
        await act(() => settlePendingWrites());

        expect(write.mock.calls.at(-1)?.[0].patch).toEqual({ scripts: null });
    });

    it('asks for the approval at the level of the group: a collection is not a folder', async () => {
        const approve = vi
            .spyOn(bridge.scripts, 'approve')
            .mockResolvedValue(success({ approved: true }));

        await show(chainOf({ onResponse: { source: 'steal()' } }, 'collection'));
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'After the response' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

        expect(approve).toHaveBeenCalledWith({
            workspaceId: 'local',
            level: 'collection',
            event: 'onResponse',
            source: 'steal()',
        });
        await waitFor(() => {
            expect(screen.queryByText('It does not run until you approve it')).toBeNull();
        });
    });

    it('shows what an import brought to the group, and moves it into the editor', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));
        const approve = vi.spyOn(bridge.scripts, 'approve');

        await show(
            chainOf(undefined, 'collection', {
                importedScripts: [
                    { event: 'onBeforeRequest', dialect: 'postman', source: 'pm.x()' },
                ],
            }),
        );

        expect(screen.getByText(/do not run here: adjust them to Mandor scripts/)).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Move to the script editor' }));
        await screen.findByText('It does not run until you approve it');
        await act(() => settlePendingWrites());

        expect(write).toHaveBeenLastCalledWith({
            workspaceId: 'local',
            path: 'pedidos/altas',
            patch: { scripts: { onBeforeRequest: { source: 'pm.x()' } }, importedScripts: null },
        });
        expect(approve).not.toHaveBeenCalled();
        expect(screen.queryByText(/do not run here/)).toBeNull();
    });

    it('draws nothing for a tab that looks at no folder', () => {
        render(
            <TabProvider value={{ resource: 'mandor://local/settings', tabId: 'settings' }}>
                <FolderScripts />
            </TabProvider>,
            { wrapper: AppProviders },
        );

        expect(screen.queryByRole('tab', { name: 'Before the request' })).toBeNull();
    });
});
