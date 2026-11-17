import { SendIcon } from '@mandor/icons';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';
import { declareItemKind } from './support/declare-item-kind.js';

const WORKSPACE = { workspaceId: 'events' };

/** One collection with a folder in it: the steps a node inside a collection can take. */
const WITH_FOLDER = [
    {
        kind: 'collection',
        name: 'Pedidos',
        path: 'pedidos',
        children: [
            { kind: 'folder', name: 'Ayer', path: 'pedidos/ayer', children: [] },
            {
                kind: 'item',
                itemKind: 'message',
                name: 'Pedido creado',
                path: 'pedidos/pedido-creado',
                tags: [],
            },
        ],
    },
    {
        kind: 'collection',
        name: 'Envios',
        path: 'envios',
        children: [
            {
                kind: 'item',
                itemKind: 'message',
                name: 'Envio creado',
                path: 'envios/envio-creado',
                tags: [],
            },
        ],
    },
] as typeof TWO_FOLDERS;

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

/**
 * A step of the keyboard starts on the row that has the focus, so the test gives it one. The
 * arrows carry `code` as well as `key`, which is what a real keyboard sends and what tells a
 * keypress apart from an event a widget made up.
 */
async function step(name: string, key: string): Promise<void> {
    const row = screen.getByRole('treeitem', { name });

    // The focus and the key both write: the step lands whole inside act.
    await act(() => {
        row.focus();
        fireEvent.keyDown(row, { altKey: true, code: key, key });

        return Promise.resolve();
    });
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

describe('moving a node with the keyboard', () => {
    it('puts the focused node above the sibling over it', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        await renderTree();
        await step('Pedido pagado', 'ArrowUp');

        expect(reorder).toHaveBeenCalledWith({
            ...WORKSPACE,
            parent: 'pedidos',
            name: 'pedido-pagado',
            before: 'pedido-creado',
        });
    });

    it('sends it below the sibling under it, which is the end when there are two', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        await renderTree();
        await step('Pedido creado', 'ArrowDown');

        expect(reorder).toHaveBeenCalledWith({
            ...WORKSPACE,
            parent: 'pedidos',
            name: 'pedido-creado',
            before: null,
        });
    });

    it('sends it into the folder over it, last of what that folder holds', async () => {
        const move = vi.spyOn(bridge.collections, 'move').mockResolvedValue(success({}));

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(WITH_FOLDER));

        await renderTree();
        await step('Pedido creado', 'ArrowRight');

        expect(move).toHaveBeenCalledWith({
            ...WORKSPACE,
            from: 'pedidos/pedido-creado',
            kind: 'item',
            to: 'pedidos/ayer/pedido-creado',
            before: null,
        });
    });

    it('takes a folder out to the top level, where it becomes a collection', async () => {
        const move = vi.spyOn(bridge.collections, 'move').mockResolvedValue(success({}));

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(WITH_FOLDER));

        await renderTree();
        await step('Ayer', 'ArrowLeft');

        expect(move).toHaveBeenCalledWith({
            ...WORKSPACE,
            from: 'pedidos/ayer',
            kind: 'folder',
            to: 'ayer',
            before: 'envios',
        });
    });

    it('writes nothing when the step has nowhere to go', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        await renderTree();
        await step('Pedido creado', 'ArrowUp');

        expect(reorder).not.toHaveBeenCalled();
    });

    /** Inside the field that renames a row, the arrows move the caret and nothing else. */
    it('moves nothing when the arrows are pressed in the field that renames a row', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        await renderTree();
        fireEvent.keyDown(screen.getByRole('treeitem', { name: 'Pedido pagado' }), {
            code: 'F2',
            key: 'F2',
        });
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'New name' }), {
            altKey: true,
            code: 'ArrowUp',
            key: 'ArrowUp',
        });

        expect(reorder).not.toHaveBeenCalled();
    });
});
