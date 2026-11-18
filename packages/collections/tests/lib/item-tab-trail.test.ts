import type { CollectionNode } from '@mandor/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { itemTabTrail } from '../../src/lib/item-tab-trail.js';

const TREE: CollectionNode[] = [
    {
        children: [
            {
                children: [
                    {
                        itemKind: 'request',
                        kind: 'item',
                        name: 'Change Password',
                        path: '4t8k2m9x1c0d/q7w3n5v6b2za/h1j5r8p0y4e6',
                        tags: [],
                    },
                ],
                kind: 'folder',
                name: 'Forget Password',
                path: '4t8k2m9x1c0d/q7w3n5v6b2za',
            },
        ],
        kind: 'collection',
        name: 'Session',
        path: '4t8k2m9x1c0d',
    },
];

const ITEM = 'mandor://local/events/item/4t8k2m9x1c0d/q7w3n5v6b2za/h1j5r8p0y4e6';

afterEach(() => {
    collectionStore.getState().reset();
});

describe('the trail a tab of an item shows', () => {
    it('is the names of its collection and its folders, outermost first', () => {
        collectionStore.getState().setNodes(TREE);

        expect(itemTabTrail(ITEM)).toEqual(['Session', 'Forget Password']);
    });

    it('is empty while the tree of the workspace has not landed', () => {
        expect(itemTabTrail(ITEM)).toEqual([]);
    });

    it('is empty for a resource that is not an item', () => {
        collectionStore.getState().setNodes(TREE);

        expect(itemTabTrail('mandor://local/events/doc/9k2m4x7q1c3d')).toEqual([]);
    });
});
