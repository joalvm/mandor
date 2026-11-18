import type { CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { FoldCollectionsEntry } from '../src/components/sidebar/FoldCollectionsEntry.js';

import { AppProviders } from './support/app-providers.js';

/** A collection with a folder inside, so folding everything reaches more than the first level. */
const NESTED: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Pedidos',
        path: 'pedidos',
        children: [
            {
                kind: 'folder',
                name: 'Pagos',
                path: 'pedidos/pagos',
                children: [
                    {
                        kind: 'item',
                        itemKind: 'message',
                        name: 'Pago hecho',
                        path: 'pedidos/pagos/pago-hecho',
                        tags: [],
                    },
                ],
            },
        ],
    },
    { kind: 'collection', name: 'Envios', path: 'envios', children: [] },
];

function mount(): void {
    render(<FoldCollectionsEntry />, { wrapper: AppProviders });
}

beforeEach(() => {
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    collectionStore.getState().setNodes(NESTED);
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the entry that folds every collection', () => {
    it('closes every collection and folder of the workspace, the deep ones as well', () => {
        collectionStore.getState().fold('events', 'envios', true);
        mount();

        fireEvent.click(screen.getByRole('button', { name: 'Collapse collections' }));

        expect([...(collectionStore.getState().folded['events'] ?? [])].sort()).toEqual([
            'envios',
            'pedidos',
            'pedidos/pagos',
        ]);
    });

    it('leaves what another workspace keeps folded as it was', () => {
        collectionStore.getState().fold('billing', 'facturas', true);
        mount();

        fireEvent.click(screen.getByRole('button', { name: 'Collapse collections' }));

        expect(collectionStore.getState().folded['billing']).toEqual(['facturas']);
    });

    it('waits for a workspace before it can be used', () => {
        shellStore.setState({ activeWorkspaceId: null });
        mount();

        expect(screen.getByRole('button', { name: 'Collapse collections' })).toBeDisabled();
    });
});
