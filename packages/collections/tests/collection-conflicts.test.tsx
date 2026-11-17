import { type ConflictSummary, success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';
import { ITEM_TAB_KIND } from '../src/item-tab-kind.js';
import { CollectionRowMenu } from '../src/components/sidebar/CollectionRowMenu.js';
import { ItemConflictMark } from '../src/components/tab/ItemConflictMark.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';

const WORKSPACE = 'events';
const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';
const ITEM: CollectionNode = {
    kind: 'item',
    itemKind: 'message',
    name: 'Pedido creado',
    path: 'pedidos/pedido-creado',
    tags: [],
};
const CLASH: ConflictSummary = {
    at: '2026-10-07T10:00:00.000Z',
    entity: { area: 'collections', path: 'pedidos/pedido-creado', workspaceId: WORKSPACE },
    id: 'aaaaaaaaaaaaaaaa',
    name: 'Pedido creado',
    sections: ['method'],
    source: 'merge',
};

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    collectionStore.getState().reset();
    shellStore.getState().reset();
});

function setClashes(conflicts: ConflictSummary[]): void {
    act(() => {
        shellStore.getState().setConflicts(conflicts);
    });
}

describe('the row of an item whose changes clash (ConflictMark)', () => {
    it('wears the mark while a clash names it, and loses it once answered', async () => {
        render(
            <>
                <WorkspaceCollection />
                <CollectionSidebar />
            </>,
            { wrapper: AppProviders },
        );

        const row = await screen.findByRole('treeitem', { name: 'Pedido creado' });
        const other = await screen.findByRole('treeitem', { name: 'Pedido pagado' });

        expect(within(row).queryByRole('img', { name: 'Conflict' })).toBeNull();

        setClashes([CLASH]);

        expect(within(row).getByRole('img', { name: 'Conflict' })).toBeVisible();
        expect(within(other).queryByRole('img', { name: 'Conflict' })).toBeNull();

        setClashes([]);

        expect(within(row).queryByRole('img', { name: 'Conflict' })).toBeNull();
    });
});

describe('the menu of that row (CollectionRowMenu)', () => {
    function openRowMenu(): void {
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Row options' }), {
            button: 0,
            ctrlKey: false,
        });
    }

    it('offers going to the clash, and going opens its tab', async () => {
        render(<CollectionRowMenu node={ITEM} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });
        setClashes([CLASH]);
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Resolve conflict' }));

        expect(selectTabs(shellStore.getState()).map((tab) => tab.id)).toEqual([
            `conflict:${CLASH.id}`,
        ]);
    });

    it('offers nothing of the kind while nothing clashes', async () => {
        render(<CollectionRowMenu node={ITEM} workspaceId={WORKSPACE} />, {
            wrapper: AppProviders,
        });
        openRowMenu();

        expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'Resolve conflict' })).toBeNull();
    });
});

describe('the tab of that item (ItemConflictMark)', () => {
    function openItemTab(): void {
        const shell = shellStore.getState();

        shell.openTab(shell.activeGroupId, {
            id: 'item-tab',
            kind: ITEM_TAB_KIND,
            resource: PEDIDO,
        });
    }

    it('shows the same mark while the item clashes, and nothing otherwise', () => {
        openItemTab();
        render(<ItemConflictMark tabId="item-tab" />, { wrapper: AppProviders });

        expect(screen.queryByRole('img', { name: 'Conflict' })).toBeNull();

        setClashes([CLASH]);

        expect(screen.getByRole('img', { name: 'Conflict' })).toBeVisible();
    });

    it('shows nothing for a tab that is not open', () => {
        render(<ItemConflictMark tabId="nowhere" />, { wrapper: AppProviders });
        setClashes([CLASH]);

        expect(screen.queryByRole('img', { name: 'Conflict' })).toBeNull();
    });
});
