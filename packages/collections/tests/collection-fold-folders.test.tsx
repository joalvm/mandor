import type { CollectionNode } from '@mandor/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { CollectionFoldFolders } from '../src/components/sidebar/CollectionFoldFolders.js';

import { AppProviders } from './support/app-providers.js';

const FOLDER: CollectionNode = {
    kind: 'folder',
    name: 'Pagos',
    path: 'pedidos/pagos',
    children: [{ kind: 'folder', name: 'Viejos', path: 'pedidos/pagos/viejos', children: [] }],
};

const COLLECTION: CollectionNode = {
    kind: 'collection',
    name: 'Pedidos',
    path: 'pedidos',
    children: [FOLDER],
};

beforeEach(() => {
    collectionStore.getState().setNodes([COLLECTION]);
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
});

describe('the button that folds what a collection holds', () => {
    it('closes every folder inside and leaves the collection open', () => {
        render(<CollectionFoldFolders node={COLLECTION} workspaceId="events" />, {
            wrapper: AppProviders,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Collapse folders' }));

        expect(collectionStore.getState().folded['events']).toEqual([
            'pedidos/pagos',
            'pedidos/pagos/viejos',
        ]);
    });

    /** A folder folds with its chevron: the button is a collection's alone. */
    it('is not drawn on the line of a folder', () => {
        render(<CollectionFoldFolders node={FOLDER} workspaceId="events" />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('button', { name: 'Collapse folders' })).toBeNull();
    });
});
