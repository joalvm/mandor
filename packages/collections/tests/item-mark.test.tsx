import { SendIcon } from '@mandor/icons';
import { success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { DrawnTabPart } from '@mandor/shell/testing/tab-kind';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    collectionStore,
    CollectionSidebar,
    ItemKind,
    ItemMark,
    ItemTabKind,
    useItem,
} from '../src/index.js';
import { ITEM_TAB_KIND } from '../src/item-tab-kind.js';

import { AppProviders } from './support/app-providers.js';

const LOGIN = 'mandor://local-apis/events/item/login';

const NODES: CollectionNode[] = [
    { kind: 'item', itemKind: 'request', mark: 'POST', name: 'Login', path: 'login', tags: [] },
];

let unregister: (() => void)[] = [];

/** The mark of the test kind: the item it is drawn for, and what the tree read off its file. */
function SavedMark() {
    const { resource, saved } = useItem();

    return <i data-resource={resource}>{saved}</i>;
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(NODES);
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(NODES));
    unregister = [
        render(<ItemTabKind />).unmount,
        render(
            <ItemKind component={SendIcon} kind="request" newLabel="collections:newItem">
                <ItemMark>
                    <SavedMark />
                </ItemMark>
            </ItemKind>,
        ).unmount,
    ];
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const release of unregister) {
        release();
    }

    shellStore.getState().reset();
});

describe('the mark an item wears (ItemMark, and ItemTabMark on its tab)', () => {
    it('stands in the row where the glyph of its kind would, with what the tree read', async () => {
        render(<CollectionSidebar />, { wrapper: AppProviders });

        const mark = await screen.findByText('POST');

        expect(mark).toHaveAttribute('data-resource', LOGIN);
        expect(mark.closest('[data-part="collection-row-mark"]')).not.toBeNull();
    });

    it('stands before the title of the tab of the item', () => {
        shellStore.getState().openTab(shellStore.getState().activeGroupId, {
            id: 'login',
            kind: ITEM_TAB_KIND,
            resource: LOGIN,
        });

        render(
            <DrawnTabPart kind={ITEM_TAB_KIND} part="indicator" resource={LOGIN} tabId="login" />,
            {
                wrapper: AppProviders,
            },
        );

        expect(screen.getByText('POST')).toHaveAttribute('data-resource', LOGIN);
    });

    it('leaves a tab without a mark when nobody gave its kind one', () => {
        unregister.pop()?.();
        shellStore.getState().openTab(shellStore.getState().activeGroupId, {
            id: 'login',
            kind: ITEM_TAB_KIND,
            resource: LOGIN,
        });

        render(
            <DrawnTabPart kind={ITEM_TAB_KIND} part="indicator" resource={LOGIN} tabId="login" />,
            {
                wrapper: AppProviders,
            },
        );

        expect(screen.queryByText('POST')).not.toBeInTheDocument();
    });
});
