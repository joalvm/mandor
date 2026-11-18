import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { useCollectionSteps } from '../../src/hooks/useCollectionSteps.js';

import { TWO_FOLDERS } from '../support/two-folders.js';

const WORKSPACE = 'events';

let tree: HTMLElement;

/** A tree of the shape the section draws: lines that carry their path and take the focus. */
function drawTree(): void {
    tree = document.createElement('div');
    document.body.append(tree);

    for (const path of ['pedidos/pedido-creado', 'pedidos/pedido-pagado']) {
        const row = document.createElement('div');

        row.setAttribute('role', 'treeitem');
        row.setAttribute('data-path', path);
        row.tabIndex = 0;
        tree.append(row);
    }
}

function rowAt(path: string): Element {
    const row = tree.querySelector(`[data-path="${path}"]`);

    if (row === null) {
        throw new Error(`No row at ${path}`);
    }

    return row;
}

/** The step lands whole inside act: the move is written and the tree is read again. */
async function press(target: Element, init: KeyboardEventInit): Promise<void> {
    await act(async () => {
        fireEvent.keyDown(target, init);
        await Promise.resolve();
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE });
    collectionStore.getState().setNodes(TWO_FOLDERS);
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
    drawTree();
});

afterEach(() => {
    cleanup();
    tree.remove();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the keys that move a node of the tree (useCollectionSteps)', () => {
    it('moves the line that has the focus one place up with Alt and the up arrow', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });
        await press(rowAt('pedidos/pedido-pagado'), {
            altKey: true,
            code: 'ArrowUp',
            key: 'ArrowUp',
        });

        expect(reorder).toHaveBeenCalledWith({
            workspaceId: WORKSPACE,
            parent: 'pedidos',
            name: 'pedido-pagado',
            before: 'pedido-creado',
        });
    });

    it('answers the other arrows with their own step, down sends it to the end', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });
        await press(rowAt('pedidos/pedido-creado'), {
            altKey: true,
            code: 'ArrowDown',
            key: 'ArrowDown',
        });

        expect(reorder).toHaveBeenCalledWith({
            workspaceId: WORKSPACE,
            parent: 'pedidos',
            name: 'pedido-creado',
            before: null,
        });
    });

    it('leaves the arrows without Alt to walk the tree', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });
        await press(rowAt('pedidos/pedido-pagado'), { code: 'ArrowUp', key: 'ArrowUp' });

        expect(reorder).not.toHaveBeenCalled();
    });

    it('does nothing when the step has nowhere to go, and keeps the key for the page', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });

        const first = rowAt('pedidos/pedido-creado');
        const event = new KeyboardEvent('keydown', {
            altKey: true,
            bubbles: true,
            cancelable: true,
            code: 'ArrowUp',
            key: 'ArrowUp',
        });

        await act(async () => {
            first.dispatchEvent(event);
            await Promise.resolve();
        });

        expect(reorder).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });

    it('takes the key for itself when it moves a node', async () => {
        vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));
        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });

        const event = new KeyboardEvent('keydown', {
            altKey: true,
            bubbles: true,
            cancelable: true,
            code: 'ArrowUp',
            key: 'ArrowUp',
        });

        await act(async () => {
            rowAt('pedidos/pedido-pagado').dispatchEvent(event);
            await Promise.resolve();
        });

        expect(event.defaultPrevented).toBe(true);
    });

    it('means nothing inside a control a line holds', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));
        const field = document.createElement('input');

        rowAt('pedidos/pedido-pagado').append(field);
        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });
        await press(field, { altKey: true, code: 'ArrowUp', key: 'ArrowUp' });

        expect(reorder).not.toHaveBeenCalled();
    });

    it('stops listening when the tree is let go of', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));
        const { unmount } = renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: tree });
        });

        unmount();
        await press(rowAt('pedidos/pedido-pagado'), {
            altKey: true,
            code: 'ArrowUp',
            key: 'ArrowUp',
        });

        expect(reorder).not.toHaveBeenCalled();
    });

    it('listens to nothing while there is no tree yet', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));

        renderHook(() => {
            useCollectionSteps(WORKSPACE, { current: null });
        });
        await press(rowAt('pedidos/pedido-pagado'), {
            altKey: true,
            code: 'ArrowUp',
            key: 'ArrowUp',
        });

        expect(reorder).not.toHaveBeenCalled();
    });
});
