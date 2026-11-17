import { SendIcon } from '@mandor/icons';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';
import { declareItemKind } from './support/declare-item-kind.js';

let unregister: () => void = () => undefined;

async function renderTree(): Promise<void> {
    render(
        <>
            <WorkspaceCollection />
            <CollectionSidebar />
        </>,
        { wrapper: AppProviders },
    );

    await screen.findAllByRole('treeitem');
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
    unregister = declareItemKind({
        id: 'message',
        component: SendIcon,
        newLabel: 'collections:newItem',
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    unregister();
    shellStore.getState().reset();
});

describe('a drag that never landed', () => {
    /** Everything is written on the drop, so a gesture that got cancelled has nothing to undo. */
    it('leaves the disk alone when Escape ends it halfway', async () => {
        const move = vi.spyOn(bridge.collections, 'move').mockResolvedValue(success({}));
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        await renderTree();

        const row = screen.getByRole('treeitem', { name: 'Pedido creado' });

        // The view defers its drag work a frame; the sequence is flushed inside act so the
        // window never updates outside of it.
        // pragmatic-drag-and-drop refuses a drag event without dataTransfer.
        const carried = { setData: () => undefined, getData: () => '' };

        await act(async () => {
            fireEvent.dragStart(row, { dataTransfer: carried });
            fireEvent.dragEnter(screen.getByRole('treeitem', { name: 'Pedido pagado' }), {
                dataTransfer: carried,
            });
            fireEvent.keyDown(row, { key: 'Escape' });
            fireEvent.dragEnd(row, { dataTransfer: carried });
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });

        expect(move).not.toHaveBeenCalled();
        expect(reorder).not.toHaveBeenCalled();
    });
});
