import { success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';

const BORN = 'pedidos/new-folder';

/** The tree once the folder asked for is on disk: the same two collections, one folder more. */
const WITH_NEW: CollectionNode[] = TWO_FOLDERS.map((node) =>
    node.kind === 'collection' && node.path === 'pedidos'
        ? {
              ...node,
              children: [
                  ...node.children,
                  { kind: 'folder', name: 'New folder', path: BORN, children: [] },
              ],
          }
        : node,
);

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

function chooseFromRow(row: string, line: string): void {
    fireEvent.pointerDown(
        within(screen.getByRole('treeitem', { name: row })).getByRole('button', {
            name: 'Row options',
        }),
        { button: 0, ctrlKey: false },
    );
    fireEvent.click(screen.getByRole('menuitem', { name: line }));
}

/** Makes the folder from the menu of «Pedidos», and hands back the field that names it. */
async function makeFolder(): Promise<HTMLElement> {
    const tree = vi.mocked(bridge.collections.tree);

    vi.spyOn(bridge.collections, 'create').mockImplementation(() => {
        tree.mockResolvedValue(success(WITH_NEW));

        return Promise.resolve(success(BORN));
    });
    await renderTree();
    chooseFromRow('Pedidos', 'New folder');

    return screen.findByRole('textbox', { name: 'New name' });
}

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

/** What cancel-naming does with a row whose name field is the first one it ever had. */
describe('Escape on the name of a folder just made', () => {
    it('takes the folder back, as if it had never been asked for', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete').mockImplementation(() => {
            vi.mocked(bridge.collections.tree).mockResolvedValue(success(TWO_FOLDERS));

            return Promise.resolve(success({}));
        });
        const field = await makeFolder();

        fireEvent.keyDown(field, { key: 'Escape' });

        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith({ path: BORN, workspaceId: 'events' });
        });
        await waitFor(() => {
            expect(screen.queryByRole('treeitem', { name: 'New folder' })).toBeNull();
        });
    });

    it('keeps it when the focus leaves the field instead', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));
        const field = await makeFolder();

        vi.spyOn(bridge.collections, 'renameFolder').mockResolvedValue(success({}));
        act(() => {
            field.blur();
        });

        expect(await screen.findByRole('treeitem', { name: 'New folder' })).toBeVisible();
        expect(remove).not.toHaveBeenCalled();
    });

    it('only closes the field of a row that already had a name', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));

        await renderTree();
        chooseFromRow('Pedidos', 'Rename');
        fireEvent.keyDown(await screen.findByRole('textbox', { name: 'New name' }), {
            key: 'Escape',
        });

        expect(screen.queryByRole('textbox', { name: 'New name' })).toBeNull();
        expect(screen.getByRole('treeitem', { name: 'Pedidos' })).toBeVisible();
        expect(remove).not.toHaveBeenCalled();
    });
});
