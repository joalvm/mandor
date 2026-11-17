import { describe, expect, it } from 'vitest';

import type {
    CollectionItemNode,
    CollectionSetNode,
} from '../../src/collection/collection-node.js';
import { collectionsFileSchema } from '../../src/collection/collections-file-schema.js';

describe('the schemas of the collection files', () => {
    it('reads the envelope of collections.yaml as the order of the top level', () => {
        expect(collectionsFileSchema.parse({ order: ['pagos', 'envios'] })).toEqual({
            order: ['pagos', 'envios'],
        });
        expect(collectionsFileSchema.parse({})).toEqual({});
    });

    it('names the node each kind of the tree carries for the lateral', () => {
        const collection: CollectionSetNode = {
            kind: 'collection',
            path: 'pagos',
            name: 'Pagos',
            children: [],
        };
        const item: CollectionItemNode = {
            kind: 'item',
            path: 'pagos/cobro',
            name: 'Cobro',
            itemKind: 'request',
            tags: [],
        };

        expect(collection.children).toEqual([]);
        expect(item.itemKind).toBe('request');
    });
});
