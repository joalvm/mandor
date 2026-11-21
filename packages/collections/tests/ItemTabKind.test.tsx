import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore, tabKind } from '@mandor/shell';
import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    collectionStore,
    CollectionSidebar,
    ItemTabKind,
    WorkspaceCollection,
} from '../src/index.js';
import { ITEM_TAB_KIND } from '../src/item-tab-kind.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';

const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';

let unregister: () => void = () => undefined;

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
    unregister = render(<ItemTabKind />).unmount;
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    unregister();
    shellStore.getState().reset();
});

async function clickItem(name: string): Promise<void> {
    render(
        <>
            <WorkspaceCollection />
            <CollectionSidebar />
        </>,
        { wrapper: AppProviders },
    );
    fireEvent.click(await screen.findByRole('treeitem', { name }));
}

describe('opening an item from the tree', () => {
    it('opens one tab on the resource the row names', async () => {
        await clickItem('Pedido creado');

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([PEDIDO]);
    });

    /** A single click only looks at the item; a double click keeps the tab it looks in. */
    it('looks at an item with a click and keeps it with the second click of a double one', async () => {
        await clickItem('Pedido creado');

        expect(selectTabs(shellStore.getState())[0]?.preview).toBe(true);

        fireEvent.click(screen.getByRole('treeitem', { name: 'Pedido creado' }), { detail: 2 });

        expect(selectTabs(shellStore.getState())[0]?.preview).toBeUndefined();
    });

    it('opens the same item once, however many times the row is clicked', async () => {
        await clickItem('Pedido creado');
        fireEvent.click(screen.getByRole('treeitem', { name: 'Pedido creado' }));

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
    });

    /** The item is open in the other half of the window, so clicking its row goes there. */
    it('goes to the tab of the item when it is open in the other group', async () => {
        await clickItem('Pedido creado');
        // The tree follows the tab in front, so a tab brought forward draws it again.
        act(() => {
            shellStore.getState().openTabAside({
                id: 'other',
                kind: 'doc',
                resource: 'mandor://local-apis/events/doc/one.md',
            });
        });
        fireEvent.click(screen.getByRole('treeitem', { name: 'Pedido creado' }));

        expect(shellStore.getState().activeGroupId).toBe(ROOT_GROUP_ID);
        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([PEDIDO]);
    });

    it('leaves a folder alone: opening it is folding it, and it opens no tab', async () => {
        await clickItem('Pedidos');

        expect(selectTabs(shellStore.getState())).toHaveLength(0);
    });

    it('titles the tab with the name of the item, not with its path', async () => {
        await clickItem('Pedido creado');

        const [tab] = selectTabs(shellStore.getState());

        expect(tab?.kind).toBe(ITEM_TAB_KIND);
        expect(tabKind(ITEM_TAB_KIND)?.title(PEDIDO, translatorIn())).toBe('Pedido creado');
    });

    it('has no title for an item the tree does not hold, and never its last segment', () => {
        const gone = 'mandor://local-apis/events/item/pedidos/9k2m4x7q1c3d';

        expect(tabKind(ITEM_TAB_KIND)?.title(gone, translatorIn())).toBe('');
    });

    it('says what the item hangs from by name, for the tooltip of its tab', async () => {
        await clickItem('Pedido creado');

        expect(tabKind(ITEM_TAB_KIND)?.trail?.(PEDIDO)).toEqual(['Pedidos']);
    });
});

describe('what the tab of an item says to the window', () => {
    it('is shown in the section of the collection', () => {
        expect(tabKind(ITEM_TAB_KIND)?.section).toBe('collections');
    });

    /** Only a kind that waits to be saved holds work; with none declared, nothing is dirty. */
    it('holds no work that is not on disk when its kind declares none', () => {
        expect(tabKind(ITEM_TAB_KIND)?.dirty?.('tab', PEDIDO)).toBe(false);
    });

    /** A kind with nothing to save answers as saved: there is no refusal to tell. */
    it('has nothing to save when its kind declares no way to', async () => {
        await expect(tabKind(ITEM_TAB_KIND)?.save?.('tab', PEDIDO)).resolves.toBeNull();
    });
});
