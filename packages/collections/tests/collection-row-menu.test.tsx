import { DocIcon } from '@mandor/icons';
import type { CollectionNode } from '@mandor/schema';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { CollectionRowMenu } from '../src/components/sidebar/CollectionRowMenu.js';

import { AppProviders } from './support/app-providers.js';
import { declareItemKind } from './support/declare-item-kind.js';

const WORKSPACE = 'events';

const FOLDER: CollectionNode = { kind: 'folder', name: 'Pedidos', path: 'pedidos', children: [] };

const ITEM: CollectionNode = {
    kind: 'item',
    itemKind: 'message',
    name: 'Pedido creado',
    path: 'pedidos/pedido-creado',
    tags: [],
};

const UNREGISTER: (() => void)[] = [];

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openRowMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Row options' }), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }

    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('CollectionRowMenu', () => {
    it('offers making a folder and every kind this window registered, on a folder', async () => {
        UNREGISTER.push(
            declareItemKind({
                id: 'message',
                component: DocIcon,
                newLabel: 'collections:newItem',
            }),
        );
        render(<CollectionRowMenu node={FOLDER} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });

        openRowMenu();

        expect(await screen.findByRole('menuitem', { name: 'New folder' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'New item' })).toBeVisible();
    });

    /** A leaf holds nothing, so making is a menu of folders only. */
    it('offers no making at all on an item', async () => {
        UNREGISTER.push(
            declareItemKind({
                id: 'message',
                component: DocIcon,
                newLabel: 'collections:newItem',
            }),
        );
        render(<CollectionRowMenu node={ITEM} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });

        openRowMenu();

        expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'New folder' })).toBeNull();
        expect(screen.queryByRole('menuitem', { name: 'New item' })).toBeNull();
    });

    it('makes a folder under the row at once, and unfolds the row to show it', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('pedidos/new-folder'));

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([FOLDER]));
        render(<CollectionRowMenu node={FOLDER} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });
        collectionStore.getState().fold(WORKSPACE, FOLDER.path, true);

        openRowMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'New folder' }));

        expect(collectionStore.getState().folded[WORKSPACE]).toEqual([]);
        await waitFor(() => {
            expect(collectionStore.getState().renaming).toBe('pedidos/new-folder');
        });
        expect(create).toHaveBeenCalledWith({
            workspaceId: WORKSPACE,
            parent: FOLDER.path,
            name: 'New folder',
        });
    });

    it('makes an item of a registered kind under the row, named by its kind', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('pedidos/new-item'));

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([FOLDER]));
        UNREGISTER.push(
            declareItemKind({
                id: 'message',
                component: DocIcon,
                newLabel: 'collections:newItem',
            }),
        );
        render(<CollectionRowMenu node={FOLDER} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });

        openRowMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'New item' }));

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({
                workspaceId: WORKSPACE,
                parent: FOLDER.path,
                name: 'New item',
                itemKind: 'message',
            });
        });
        expect(collectionStore.getState().renaming).toBeNull();
    });

    it('names the row the one being renamed', async () => {
        render(<CollectionRowMenu node={ITEM} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });

        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        expect(collectionStore.getState().renaming).toBe(ITEM.path);
    });

    it('asks about the row alone when it is not among what is taken', async () => {
        collectionStore.getState().setSelected(['envios']);
        render(<CollectionRowMenu node={ITEM} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });

        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

        expect(collectionStore.getState().deleting).toEqual([ITEM.path]);
    });

    /** The menu of a taken row speaks for everything taken, as the Delete key does (actedPaths). */
    it('asks about everything taken when the row is among it', async () => {
        collectionStore.getState().setSelected([ITEM.path, 'envios']);
        render(<CollectionRowMenu node={ITEM} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });

        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

        expect(collectionStore.getState().deleting).toEqual([ITEM.path, 'envios']);
    });
});
