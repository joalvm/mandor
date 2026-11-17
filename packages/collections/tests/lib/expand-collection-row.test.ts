import type { CollectionNode } from '@mandor/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { collectionRows } from '../../src/lib/collection-rows.js';
import { expandCollectionRow } from '../../src/lib/expand-collection-row.js';

const TREE: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Acceso',
        path: 'acceso',
        children: [
            { kind: 'folder', name: 'Viejos', path: 'acceso/viejos', children: [] },
            {
                kind: 'item',
                itemKind: 'request',
                name: 'Login',
                path: 'acceso/login',
                examples: [{ key: 'Creado', name: 'Creado' }],
                tags: [],
            },
        ],
    },
];

const ROWS = collectionRows(TREE, [], []);

afterEach(() => {
    collectionStore.getState().reset();
});

describe('opening or closing a line of the tree', () => {
    it('folds a collection and a folder when closed, and unfolds them when opened', () => {
        expandCollectionRow('events', ROWS, 'acceso', false);
        expandCollectionRow('events', ROWS, 'acceso/viejos', false);

        expect(collectionStore.getState().folded['events']).toEqual(['acceso', 'acceso/viejos']);

        expandCollectionRow('events', ROWS, 'acceso', true);

        expect(collectionStore.getState().folded['events']).toEqual(['acceso/viejos']);
    });

    it('shows the examples of an item when opened, and hides them when closed', () => {
        expandCollectionRow('events', ROWS, 'acceso/login', false);

        expect(collectionStore.getState().examplesClosed['events']).toEqual(['acceso/login']);

        expandCollectionRow('events', ROWS, 'acceso/login', true);

        expect(collectionStore.getState().examplesClosed['events']).toEqual([]);
    });

    it('does nothing for the line of an example, or for one that is not there', () => {
        expandCollectionRow('events', collectionRows(TREE, [], []), 'acceso/login:Creado', true);
        expandCollectionRow('events', ROWS, 'gone', true);

        expect([
            collectionStore.getState().folded,
            collectionStore.getState().examplesClosed,
        ]).toEqual([{}, {}]);
    });
});
