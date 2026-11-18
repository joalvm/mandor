import { SendIcon } from '@mandor/icons';
import { success } from '@mandor/ipc';
import { bridge, shellStore, TabProvider } from '@mandor/shell';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useItemPart } from '../src/components/item-kind/useItemPart.js';
import { useItemLeaf } from '../src/hooks/useItemLeaf.js';
import { useTabItem } from '../src/hooks/useTabItem.js';
import {
    collectionStore,
    ItemBody,
    ItemKind,
    ItemMark,
    ItemStatus,
    ItemTab,
    itemLeaf,
    useItem,
} from '../src/index.js';
import { itemLeaves } from '../src/item-leaf-registry.js';

import { AppProviders } from './support/app-providers.js';
import { TWO_FOLDERS } from './support/two-folders.js';

const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(TWO_FOLDERS);
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

/** What a part shows of the item it is drawn for, read from the item and not from props. */
function ShownItem() {
    const { resource } = useItem();

    return <p>{resource}</p>;
}

function MessageKind() {
    return (
        <ItemKind component={SendIcon} kind="message" newLabel="collections:newItem">
            <ItemMark>
                <span>marca</span>
            </ItemMark>
            <ItemBody>
                <ShownItem />
            </ItemBody>
            <ItemStatus>
                <span>estado</span>
            </ItemStatus>
        </ItemKind>
    );
}

describe('a kind of item declared in the tree', () => {
    it('is known to the collection while it is mounted, with its logic and its parts', () => {
        const view = render(<MessageKind />);
        const leaf = itemLeaf('message');

        expect(leaf?.component).toBe(SendIcon);
        expect(leaf?.newLabel).toBe('collections:newItem');
        expect(leaf?.body).toBeDefined();
        expect(leaf?.mark).toBeDefined();
        expect(leaf?.status).toBeDefined();
        expect(itemLeaves().map((each) => each.id)).toEqual(['message']);

        view.unmount();

        expect(itemLeaf('message')).toBeUndefined();
    });

    it('is followed by whoever draws it, as it comes and goes', () => {
        const watched = renderHook(() => useItemLeaf('message'));
        const view = render(<MessageKind />);

        expect(watched.result.current?.id).toBe('message');

        act(() => {
            view.unmount();
        });

        expect(watched.result.current).toBeUndefined();
    });

    it('opens its body in the tab of the item, reading the item it is drawn for', () => {
        render(
            <>
                <MessageKind />
                <TabProvider value={{ resource: PEDIDO, tabId: PEDIDO }}>
                    <ItemTab />
                </TabProvider>
            </>,
            { wrapper: AppProviders },
        );

        expect(screen.getByText(PEDIDO)).toBeInTheDocument();
    });

    it('is what a tab of the collection finds for the item it is open on', () => {
        render(<MessageKind />);

        const { result } = renderHook(() => useTabItem(), {
            wrapper: ({ children }) => (
                <TabProvider value={{ resource: PEDIDO, tabId: PEDIDO }}>{children}</TabProvider>
            ),
        });

        expect(result.current.leaf?.id).toBe('message');
        expect(result.current.name).toBe('Pedido creado');
    });

    /** This is what Sync sees until the message item arrives, and it has to be a page, not a crash. */
    it('says nobody knows the kind instead of throwing, when no kind is declared', () => {
        expect(() => {
            render(
                <TabProvider value={{ resource: PEDIDO, tabId: PEDIDO }}>
                    <ItemTab />
                </TabProvider>,
                { wrapper: AppProviders },
            );
        }).not.toThrow();

        expect(screen.getByText(/kind "message"/)).toBeInTheDocument();
    });

    it('draws an item of a kind nobody declared in the tree all the same', async () => {
        const { CollectionSidebar } = await import('../src/index.js');

        render(<CollectionSidebar />, { wrapper: AppProviders });

        expect(await screen.findByRole('treeitem', { name: 'Pedido creado' })).toBeInTheDocument();
    });

    it('refuses a part written outside a kind', () => {
        expect(() => {
            renderHook(() => {
                useItemPart('body', null);
            });
        }).toThrow('An item body is declared inside an ItemKind.');
    });
});
