import { SendIcon } from '@mandor/icons';
import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';
import { declareItemKind } from './support/declare-item-kind.js';

const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';

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

/** Row actions live behind a menu, so a test opens the one of the row it means. */
function openRowMenu(name: string): void {
    const row = screen.getByRole('treeitem', { name });

    fireEvent.pointerDown(within(row).getByRole('button', { name: 'Row options' }), {
        button: 0,
        ctrlKey: false,
    });
}

function type(field: HTMLElement, value: string): void {
    field.textContent = value;
    fireEvent.input(field);
    fireEvent.keyDown(field, { key: 'Enter' });
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

describe('the four things the row menu does', () => {
    it('makes a folder at once inside the folder that was asked, under the word it is born with', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('pedidos/hoy'));

        await renderTree();
        openRowMenu('Pedidos');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'New folder' }));

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({
                name: 'New folder',
                parent: 'pedidos',
                workspaceId: 'events',
            });
        });
    });

    it('makes an item of the kind the window drew, not a folder', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('pedidos/pedido-roto'));

        await renderTree();
        openRowMenu('Pedidos');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'New item' }));

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({
                itemKind: 'message',
                name: 'New item',
                parent: 'pedidos',
                workspaceId: 'events',
            });
        });
    });

    it('renames an item through the channel for items, and a folder through the other', async () => {
        const rename = vi.spyOn(bridge.collections, 'renameItem').mockResolvedValue(success({}));

        await renderTree();
        openRowMenu('Pedido creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
        type(screen.getByRole('textbox', { name: 'New name' }), 'Pedido roto');

        await waitFor(() => {
            expect(rename).toHaveBeenCalledWith({
                name: 'Pedido roto',
                path: 'pedidos/pedido-creado',
                workspaceId: 'events',
            });
        });
    });

    /** A rename writes the name in the file and moves nothing: the tabs stay where they are. */
    it('leaves the tabs of a renamed item pointing at the same item', async () => {
        vi.spyOn(bridge.collections, 'renameItem').mockResolvedValue(success({}));
        shellStore.getState().openTab(ROOT_GROUP_ID, { id: 'one', kind: 'item', resource: PEDIDO });

        await renderTree();
        openRowMenu('Pedido creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
        type(screen.getByRole('textbox', { name: 'New name' }), 'Pedido roto');

        await waitFor(() => {
            expect(bridge.collections.renameItem).toHaveBeenCalledTimes(1);
        });
        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([PEDIDO]);
    });

    it('asks before deleting, and deletes nothing while the question is open', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete');

        await renderTree();
        openRowMenu('Pedidos');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('Pedidos');
        expect(remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith({ path: 'pedidos', workspaceId: 'events' });
        });
    });

    it('leaves the tabs of a deleted item open, marked as looking at nothing', async () => {
        vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));
        shellStore.getState().openTab(ROOT_GROUP_ID, { id: 'one', kind: 'item', resource: PEDIDO });

        await renderTree();
        openRowMenu('Pedido creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(shellStore.getState().resources[PEDIDO]?.missing).toBe(true);
        });
        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });
});
