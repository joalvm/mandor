import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the collection the window keeps', () => {
    /**
     * Folding a section unmounts its body. A body that loaded the tree on mount emptied it on
     * every unfold, and the rows and every breadcrumb reading the tree blinked with it.
     */
    it('keeps the tree through a fold of the section, without reading it again', async () => {
        render(<WorkspaceCollection />, { wrapper: AppProviders });

        const unfolded = render(<CollectionSidebar />, { wrapper: AppProviders });

        await screen.findAllByRole('treeitem');
        unfolded.unmount();
        render(<CollectionSidebar />, { wrapper: AppProviders });

        expect(screen.getAllByRole('treeitem')).toHaveLength(6);
        expect(bridge.collections.tree).toHaveBeenCalledTimes(1);
    });

    it('reads the tree again when a file of its collection changed on disk', async () => {
        render(<WorkspaceCollection />, { wrapper: AppProviders });
        await waitFor(() => {
            expect(bridge.collections.tree).toHaveBeenCalledTimes(1);
        });

        (bridge as FakeBridge).emitRepoChanged({
            changes: [
                { area: 'collections', workspaceId: 'events', path: 'pedidos/pedido-creado' },
            ],
        });

        await waitFor(() => {
            expect(bridge.collections.tree).toHaveBeenCalledTimes(2);
        });
    });

    it('leaves the tree alone for a change in another workspace or another area', async () => {
        render(<WorkspaceCollection />, { wrapper: AppProviders });
        await waitFor(() => {
            expect(bridge.collections.tree).toHaveBeenCalledTimes(1);
        });

        (bridge as FakeBridge).emitRepoChanged({
            changes: [
                { area: 'collections', workspaceId: 'otro', path: 'x' },
                { area: 'environment', workspaceId: 'events', id: 'prod' },
            ],
        });

        expect(bridge.collections.tree).toHaveBeenCalledTimes(1);
    });
});
