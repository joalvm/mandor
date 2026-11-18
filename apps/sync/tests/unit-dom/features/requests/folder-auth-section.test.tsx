import { collectionStore } from '@mandor/collections';
import { envStore, reloadFolderChains } from '@mandor/env';
import { failure, success } from '@mandor/ipc';
import type { AuthConfig, FolderChainLevel } from '@mandor/schema';
import { bridge, selectTabs, settlePendingWrites, shellStore, TabProvider } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FolderAuthSection } from '../../../../src/renderer/features/requests/components/folder/FolderAuthSection.js';
import { AppProviders } from '../../support/app-providers.js';

const BEARER: AuthConfig = { type: 'bearer', token: 't' };
const TAB = { resource: 'mandor://local/local/folder/pedidos/altas', tabId: 'folder-1' };

function chainOf(
    own: AuthConfig | undefined,
    above: { collection?: AuthConfig; workspace?: AuthConfig } = {},
): FolderChainLevel[] {
    return [
        {
            level: 'folder',
            place: { kind: 'folder', path: 'pedidos/altas' },
            name: 'Altas',
            settings: own === undefined ? {} : { auth: own },
        },
        {
            level: 'collection',
            place: { kind: 'folder', path: 'pedidos' },
            name: 'Pedidos',
            settings: above.collection === undefined ? {} : { auth: above.collection },
        },
        {
            level: 'workspace',
            place: { kind: 'workspace' },
            name: 'Personal',
            settings: above.workspace === undefined ? {} : { auth: above.workspace },
        },
    ];
}

async function show(chain: FolderChainLevel[]): Promise<void> {
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chain));
    render(
        <TabProvider value={TAB}>
            <FolderAuthSection />
        </TabProvider>,
        { wrapper: AppProviders },
    );
    await screen.findByRole('combobox', { name: 'Type' });
}

function pickScheme(name: string): void {
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Type' }), { key: 'ArrowDown' });
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name }));
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

describe('the auth of a collection or a folder, in its tab', () => {
    it('edits the first level of the chain the tab looks at', async () => {
        await show(chainOf(BEARER));

        expect(bridge.collections.chain).toHaveBeenCalledWith({
            workspaceId: 'local',
            parentPath: 'pedidos/altas',
        });
        expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Bearer');
    });

    it('writes the scheme through the patch of the settings, after the pause', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        await show(chainOf(BEARER));
        pickScheme('Basic');

        expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Basic');

        await act(() => settlePendingWrites());

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'local',
            path: 'pedidos/altas',
            patch: { auth: { type: 'basic', username: '', password: '' } },
        });
    });

    it('takes the auth out of the file when the level goes back to inherit', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        await show(chainOf(BEARER));
        pickScheme('Inherit');
        await act(() => settlePendingWrites());

        expect(write.mock.calls[0]?.[0].patch).toEqual({ auth: null });
    });

    it('names the folder that rules, and the name leads to the auth of that folder', async () => {
        await show(chainOf(undefined, { collection: BEARER }));

        expect(screen.getByText(/Inherits Bearer from/u)).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }));

        const [opened] = selectTabs(shellStore.getState());

        expect(opened?.resource).toContain('pedidos');
        expect(collectionStore.getState().folderSections[opened?.id ?? '']).toBe('auth');
    });

    it('says the workspace rules in words: it has no tab to lead to', async () => {
        await show(chainOf(undefined, { workspace: BEARER }));

        expect(await screen.findByText('Uses Bearer from Personal.')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Personal' })).toBeNull();
    });

    it('says so when no level above carries an auth', async () => {
        await show(chainOf(undefined));

        expect(await screen.findByText(/the request goes out without it/u)).toBeVisible();
    });

    it('does not say who rules while the level carries its own auth', async () => {
        await show(chainOf(BEARER, { collection: { type: 'none' } }));

        expect(screen.queryByText(/Inherits/u)).toBeNull();
    });

    it('follows the file when it changes out of the window', async () => {
        await show(chainOf(BEARER));

        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(
            success(chainOf({ type: 'basic', username: '', password: '' })),
        );
        await act(() => reloadFolderChains('local'));

        expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Basic');
    });

    it('raises a toast when the write is refused, and shows what the disk holds', async () => {
        vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(
            failure('not-found', 'the folder is gone'),
        );
        const onNotify = vi.fn();

        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chainOf(BEARER)));
        render(
            <AppProviders onNotify={onNotify}>
                <TabProvider value={TAB}>
                    <FolderAuthSection />
                </TabProvider>
            </AppProviders>,
        );
        await screen.findByRole('combobox', { name: 'Type' });

        pickScheme('Basic');
        await act(() => settlePendingWrites());

        expect(onNotify).toHaveBeenCalledOnce();
        expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Bearer');
    });

    it('draws nothing for a tab that looks at no folder', () => {
        const { container } = render(
            <TabProvider value={{ resource: 'mandor://local/settings', tabId: 'settings' }}>
                <FolderAuthSection />
            </TabProvider>,
            { wrapper: AppProviders },
        );

        expect(container.querySelector('[data-part="folder-auth"]')).toBeNull();
    });
});
