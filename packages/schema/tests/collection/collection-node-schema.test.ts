import { describe, expect, it } from 'vitest';

import { collectionNodeSchema } from '../../src/collection/collection-node-schema.js';

const ITEM = { kind: 'item', path: 'orders/list', name: 'List', itemKind: 'http', tags: [] };

describe('the schema of a node of the collection tree', () => {
    it('takes a collection that holds a folder that holds an item, at any depth', () => {
        const tree = {
            kind: 'collection',
            path: 'orders',
            name: 'Orders',
            description: 'What the shop sells',
            children: [{ kind: 'folder', path: 'orders/old', name: 'Old', children: [ITEM] }],
        };

        expect(collectionNodeSchema.parse(tree)).toEqual(tree);
    });

    it('takes the mark an item wears beside its name', () => {
        const marked = { ...ITEM, mark: 'GET' };

        expect(collectionNodeSchema.parse(marked)).toEqual(marked);
    });

    it('takes the examples an item lists under it', () => {
        const listed = {
            ...ITEM,
            examples: [
                { key: 'OK', name: 'OK', mark: '200' },
                { key: 'B', name: 'B' },
            ],
        };

        expect(collectionNodeSchema.parse(listed)).toEqual(listed);
        expect(
            collectionNodeSchema.safeParse({ ...ITEM, examples: [{ key: 'OK', name: 'OK', x: 1 }] })
                .success,
        ).toBe(false);
    });

    it('refuses a broken node deep inside the tree', () => {
        const tree = {
            kind: 'folder',
            path: 'orders',
            name: 'Orders',
            children: [{ ...ITEM, tags: 'none' }],
        };

        expect(collectionNodeSchema.safeParse(tree).success).toBe(false);
    });

    it('refuses an unknown kind and a key out of contract', () => {
        expect(collectionNodeSchema.safeParse({ ...ITEM, kind: 'set' }).success).toBe(false);
        expect(collectionNodeSchema.safeParse({ ...ITEM, body: '{}' }).success).toBe(false);
    });
});
