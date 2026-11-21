import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { collectionLineOf } from '../src/lib/collection-line-of.js';
import { showCollectionLine } from '../src/lib/show-collection-line.js';

afterEach(() => {
    collectionStore.getState().reset();
});

describe('the line of the tree a resource stands for', () => {
    it('is the line of an item, under every folder it sits in', () => {
        expect(
            collectionLineOf('mandor://local/events/item/pedidos/2026/pagado', 'events'),
        ).toEqual({
            examplesOf: null,
            folders: ['pedidos', 'pedidos/2026'],
            line: 'pedidos/2026/pagado',
        });
    });

    it('is the line of a folder, which stays as it is', () => {
        expect(collectionLineOf('mandor://local/events/folder/pedidos/2026', 'events')).toEqual({
            examplesOf: null,
            folders: ['pedidos'],
            line: 'pedidos/2026',
        });
    });

    it('is the line of an example, under its item opened on its examples', () => {
        expect(
            collectionLineOf('mandor://local/events/example/pedidos/pagado/ok', 'events'),
        ).toEqual({
            examplesOf: 'pedidos/pagado',
            folders: ['pedidos'],
            line: 'pedidos/pagado:ok',
        });
    });

    it('is no line for a resource of another workspace', () => {
        expect(collectionLineOf('mandor://local/billing/item/pedidos/pagado', 'events')).toBeNull();
    });

    it('is no line for a resource the tree does not list', () => {
        expect(collectionLineOf('mandor://local/events/doc/readme.md', 'events')).toBeNull();
    });
});

describe('showing a line of the tree', () => {
    it('opens what hides it and takes it alone', () => {
        collectionStore.getState().fold('events', 'pedidos', true);
        collectionStore.getState().openExamples('events', 'pedidos/pagado', false);
        collectionStore.getState().setSelected(['envios']);

        showCollectionLine('events', {
            examplesOf: 'pedidos/pagado',
            folders: ['pedidos'],
            line: 'pedidos/pagado:ok',
        });

        expect(collectionStore.getState().folded['events']).toEqual([]);
        expect(collectionStore.getState().examplesClosed['events']).toEqual([]);
        expect(collectionStore.getState().selected).toEqual(['pedidos/pagado:ok']);
    });
});
