import { shellStore, Sidebar } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { CollectionsSection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', kind: 'local', name: 'Local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    collectionStore.setState({
        nodes: [
            { kind: 'item', itemKind: 'event', name: 'Pedido creado', path: 'pedido', tags: [] },
        ],
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the section of the collection', () => {
    it('puts the reusable work of the workspace in the lateral while it is mounted', () => {
        const view = render(
            <>
                <CollectionsSection order={20} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('button', { name: 'Collections' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getByRole('treeitem', { name: 'Pedido creado' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Collections' })).toHaveTextContent(
            /^Collections$/,
        );

        view.rerender(<Sidebar />);

        expect(screen.queryByRole('button', { name: 'Collections' })).toBeNull();
    });

    /** Closing the section closes the tree too, so it opens again on its collections alone. */
    it('folds every collection and folder when the section is folded', () => {
        collectionStore.getState().setNodes([
            {
                kind: 'collection',
                name: 'Pedidos',
                path: 'pedidos',
                children: [{ kind: 'folder', name: 'Pagos', path: 'pedidos/pagos', children: [] }],
            },
        ]);
        render(
            <>
                <CollectionsSection order={20} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Collections' }));

        expect(collectionStore.getState().folded['events']).toEqual(['pedidos', 'pedidos/pagos']);
    });
});
