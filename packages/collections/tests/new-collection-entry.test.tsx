import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { NewCollectionEntry } from '../src/components/sidebar/NewCollectionEntry.js';

import { AppProviders } from './support/app-providers.js';

/** The entry lives beside the heading of the section: the one place no row can offer a menu. */
function mount(): void {
    render(<NewCollectionEntry />, { wrapper: AppProviders });
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the entry that makes a collection', () => {
    it('offers itself under the words of the section', () => {
        mount();

        expect(screen.getByRole('button', { name: 'New collection' })).toBeEnabled();
    });

    it('makes a collection at the top level at once and leaves its row naming it', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('new-collection'));

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));
        mount();

        fireEvent.click(screen.getByRole('button', { name: 'New collection' }));

        await waitFor(() => {
            expect(collectionStore.getState().renaming).toBe('new-collection');
        });
        expect(create).toHaveBeenCalledWith({
            workspaceId: 'events',
            parent: '',
            name: 'New collection',
        });
    });

    it('waits for a workspace before it can be used', () => {
        shellStore.setState({ activeWorkspaceId: null });
        mount();

        expect(screen.getByRole('button', { name: 'New collection' })).toBeDisabled();
    });
});
