import { describe, expect, it } from 'vitest';

import { itemPathsUnder } from '../../src/lib/item-paths-under.js';

import type { CollectionNode } from '@mandor/schema';

const REQUEST: CollectionNode = {
    itemKind: 'request',
    kind: 'item',
    mark: 'GET',
    name: 'crear',
    path: 'pedidos/crear',
    tags: [],
};

const PEDIDOS: CollectionNode = {
    children: [REQUEST],
    kind: 'folder',
    name: 'Pedidos',
    path: 'pedidos',
};

describe('the paths an item covers, under one node', () => {
    it('lists every item the folder holds', () => {
        expect(itemPathsUnder(PEDIDOS)).toEqual(['pedidos/crear']);
    });

    it('answers the item itself when the node is one', () => {
        expect(itemPathsUnder(REQUEST)).toEqual(['pedidos/crear']);
    });
});
