import { success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { byPart } from '@mandor/ui/testing';
import { cleanup, act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';

function renderCollection(): ReturnType<typeof render> {
    return render(
        <>
            <WorkspaceCollection />
            <CollectionSidebar />
        </>,
        { wrapper: AppProviders },
    );
}

async function renderTree(): Promise<HTMLElement[]> {
    renderCollection();

    return screen.findAllByRole('treeitem');
}

function row(name: string): HTMLElement {
    return screen.getByRole('treeitem', { name });
}

function takenNames(): (string | null)[] {
    return screen
        .getAllByRole('treeitem')
        .filter((line) => line.getAttribute('aria-selected') === 'true')
        .map((line) => byPart('row-label', line).textContent);
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

describe('the collection in the sidebar', () => {
    it('draws one row per folder and per item', async () => {
        expect(await renderTree()).toHaveLength(6);
    });

    /** The glyph of a node stands as small as the chevron that folds it, and never swaps. */
    it('draws every node beside the small glyph of its kind', async () => {
        const glyphs = (await renderTree()).map((node) => node.querySelector(':scope > svg'));

        expect(glyphs.map((glyph) => glyph?.getAttribute('width'))).toEqual(Array(6).fill('14'));
    });

    it('folds a folder away when it is clicked, and leaves its children out of the tree', async () => {
        await renderTree();
        fireEvent.click(row('Pedidos'));

        expect(screen.getAllByRole('treeitem')).toHaveLength(4);
    });

    /** A folder folds where it is clicked, and the click takes the line with it. */
    it('folds a folder where it is clicked, and takes the line with it', async () => {
        await renderTree();
        fireEvent.click(row('Envios'));

        expect(screen.getAllByRole('treeitem')).toHaveLength(4);
        expect(takenNames()).toEqual(['Envios']);
    });

    it('remembers what was folded across a mount, because folding is of the workspace', async () => {
        const first = renderCollection();

        await screen.findAllByRole('treeitem');
        fireEvent.click(row('Pedidos'));
        first.unmount();

        expect(await renderTree()).toHaveLength(4);
    });

    /** The header holds the ways to fill it, so an empty collection has nothing to say. */
    it('draws no tree for an empty collection', async () => {
        const tree = vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));

        renderCollection();

        await waitFor(() => {
            expect(tree).toHaveBeenCalled();
        });
        expect(screen.queryByRole('tree')).toBeNull();
    });

    /** Renaming does not owe anything to the menu: F2 names the row the reader stands on. */
    it('opens the rename field of the focused row on F2', async () => {
        await renderTree();

        act(() => {
            fireEvent.keyDown(screen.getByRole('treeitem', { name: 'Pedidos' }), {
                code: 'F2',
                key: 'F2',
            });
        });

        expect(screen.getByRole('textbox', { name: 'New name' }).textContent).toBe('Pedidos');
    });
});

describe('taking many rows of the collection', () => {
    it('adds rows with Ctrl and stretches a range with Shift, and the store holds them', async () => {
        await renderTree();
        fireEvent.click(row('Pedido creado'));
        fireEvent.click(row('Envio creado'), { ctrlKey: true });

        expect(collectionStore.getState().selected).toEqual([
            'pedidos/pedido-creado',
            'envios/envio-creado',
        ]);

        fireEvent.click(row('Pedido pagado'), { shiftKey: true });

        expect(takenNames()).toEqual(['Pedido pagado', 'Envios', 'Envio creado']);
    });

    /** Taking one more row is not asking to see it: only a plain press opens an item. */
    it('opens an item on a plain click and not on a click with Ctrl', async () => {
        await renderTree();
        fireEvent.click(row('Pedido creado'));
        fireEvent.click(row('Pedido pagado'), { ctrlKey: true });

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
            'mandor://local-apis/events/item/pedidos/pedido-creado',
        ]);
    });

    it('asks about everything taken when Delete is pressed on one of them', async () => {
        await renderTree();
        fireEvent.click(row('Pedido creado'));
        fireEvent.click(row('Envio creado'), { ctrlKey: true });
        fireEvent.keyDown(row('Envio creado'), { key: 'Delete' });

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('2 entries');
    });
});

describe('an item a tab asks the lateral to show', () => {
    it('opens its folders, takes it and hands it the focus, then says it is shown', async () => {
        await renderTree();
        fireEvent.click(row('Pedidos'));

        act(() => {
            shellStore
                .getState()
                .setRevealing('mandor://local-apis/events/item/pedidos/pedido-pagado');
        });

        expect(row('Pedido pagado')).toHaveFocus();
        expect(takenNames()).toEqual(['Pedido pagado']);
        expect(shellStore.getState().revealing).toBeNull();
    });

    it('leaves alone what another workspace asks for', async () => {
        await renderTree();

        act(() => {
            shellStore
                .getState()
                .setRevealing('mandor://local-apis/billing/item/pedidos/pedido-pagado');
        });

        expect(takenNames()).toEqual([]);
        expect(shellStore.getState().revealing).not.toBeNull();
    });
});

/** What the window shows is what the tree marks, as an explorer follows the editor in front. */
describe('the collection following the tab in front', () => {
    const PAGADO = 'mandor://local-apis/events/item/pedidos/pedido-pagado';
    const ENVIO = 'mandor://local-apis/events/item/envios/envio-creado';

    function bringToFront(id: string, resource: string): void {
        act(() => {
            const shell = shellStore.getState();

            shell.openTab(shell.activeGroupId, { id, kind: 'item', resource });
        });
    }

    it('takes the line of the tab in front and opens the folders above it, leaving the focus where it was', async () => {
        await renderTree();
        fireEvent.click(row('Pedidos'));

        expect(screen.queryByRole('treeitem', { name: 'Pedido pagado' })).toBeNull();

        bringToFront('pagado', PAGADO);

        expect(row('Pedido pagado')).toBeVisible();
        expect(takenNames()).toEqual(['Pedido pagado']);
        expect(row('Pedido pagado')).not.toHaveFocus();
    });

    /** Going back to a tab marks its line again, over whatever was taken in the meantime. */
    it('takes the line again when its tab comes back to the front', async () => {
        await renderTree();
        bringToFront('pagado', PAGADO);
        bringToFront('envio', ENVIO);

        expect(takenNames()).toEqual(['Envio creado']);

        act(() => {
            collectionStore.getState().setSelected(['pedidos']);
        });
        act(() => {
            const shell = shellStore.getState();

            shell.setActiveTab(shell.activeGroupId, 'pagado');
        });

        expect(takenNames()).toEqual(['Pedido pagado']);
    });

    it('leaves what the user took while the same tab stays in front', async () => {
        await renderTree();
        bringToFront('pagado', PAGADO);

        act(() => {
            collectionStore.getState().setSelected(['pedidos']);
        });

        expect(takenNames()).toEqual(['Pedidos']);
    });

    it('leaves the tree alone for a tab of another workspace', async () => {
        await renderTree();
        bringToFront('billing', 'mandor://local-apis/billing/item/pedidos/pedido-pagado');

        expect(takenNames()).toEqual([]);
    });

    /**
     * A tab can hold inside it something the tree lists, with no tab of its own: a connection of
     * Realtime composing a message. The tree follows that one, and again each time it changes.
     */
    it('takes the line of what the tab in front holds inside, when its kind says it holds one', async () => {
        let inside: string | null = PAGADO;
        let notify = (): void => undefined;
        const stop = declareTabKindSpec({
            closable: true,
            icon: 'connection',
            id: 'composer',
            inside: () => inside,
            subscribeInside: (onChange) => {
                notify = onChange;

                return () => undefined;
            },
            title: () => 'Echo',
        });

        try {
            await renderTree();
            act(() => {
                const shell = shellStore.getState();

                shell.openTab(shell.activeGroupId, {
                    id: 'echo',
                    kind: 'composer',
                    resource: 'mandor://local-apis/events/connection/echo',
                });
            });

            expect(takenNames()).toEqual(['Pedido pagado']);

            inside = ENVIO;
            act(() => {
                notify();
            });

            expect(takenNames()).toEqual(['Envio creado']);
        } finally {
            // The tree is still mounted and reads the kind, so letting it go is an update.
            act(() => {
                stop();
            });
        }
    });
});
