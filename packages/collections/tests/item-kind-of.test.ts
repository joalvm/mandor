import { beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { itemKindOf } from '../src/lib/item-kind-of.js';

import { TWO_FOLDERS } from './support/two-folders.js';

const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';
const FUERA = 'mandor://local-apis/events/item/fuera/de-collectiono';

beforeEach(() => {
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(TWO_FOLDERS);
});

describe('the kind of the item a resource names', () => {
    it('is the kind the tree gives the item at that path', () => {
        expect(itemKindOf(PEDIDO)).toBe('message');
    });

    it('is nothing for a path the tree no longer has', () => {
        expect(itemKindOf(FUERA)).toBeUndefined();
    });

    it('is nothing for a resource that is not an item', () => {
        expect(itemKindOf('mandor://local-apis/events/doc/pedidos/notas.md')).toBeUndefined();
    });
});
