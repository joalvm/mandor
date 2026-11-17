import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { itemTitle } from '../../src/lib/item-title.js';

import { TWO_FOLDERS } from '../support/two-folders.js';

const ITEM = 'mandor://local/events/item/pedidos/pedido-pagado';

afterEach(() => {
    collectionStore.getState().reset();
});

describe('the title a tab of an item shows', () => {
    it('is the name the file gives the item', () => {
        collectionStore.getState().setNodes(TWO_FOLDERS);

        expect(itemTitle(ITEM)).toBe('Pedido pagado');
    });

    it('is nothing while the tree of the workspace has not landed, never the id', () => {
        expect(itemTitle(ITEM)).toBe('');
    });

    it('is nothing for an item the tree does not hold', () => {
        collectionStore.getState().setNodes(TWO_FOLDERS);

        expect(itemTitle('mandor://local/events/item/pedidos/borrado')).toBe('');
    });

    it('is nothing for a resource that is not an item', () => {
        collectionStore.getState().setNodes(TWO_FOLDERS);

        expect(itemTitle('mandor://local/events/doc/9k2m4x7q1c3d')).toBe('');
    });
});
