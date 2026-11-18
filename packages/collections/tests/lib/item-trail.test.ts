import type { CollectionNode } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { itemTrail } from '../../src/index.js';

const TREE: CollectionNode[] = [
    {
        children: [
            {
                children: [
                    {
                        itemKind: 'request',
                        kind: 'item',
                        name: 'Change Password',
                        path: 'session/forget/change',
                        tags: [],
                    },
                ],
                kind: 'folder',
                name: 'Forget Password',
                path: 'session/forget',
            },
            {
                itemKind: 'request',
                kind: 'item',
                name: 'Login',
                path: 'session/login',
                tags: [],
            },
        ],
        kind: 'collection',
        name: 'Session',
        path: 'session',
    },
];

describe('what an item hangs from', () => {
    it('names its collection and its folders from the outermost, by what the tree calls them', () => {
        expect(itemTrail(TREE, 'session/forget/change')).toEqual(['Session', 'Forget Password']);
    });

    it('names the collection alone for an item under no folder', () => {
        expect(itemTrail(TREE, 'session/login')).toEqual(['Session']);
    });

    it('stops at what the tree has not brought yet', () => {
        expect(itemTrail(TREE, 'session/later/crear')).toEqual(['Session']);
        expect(itemTrail([], 'session/forget/change')).toEqual([]);
    });

    it('never names an item as something an item hangs from', () => {
        expect(itemTrail(TREE, 'session/login/odd')).toEqual(['Session']);
    });
});
