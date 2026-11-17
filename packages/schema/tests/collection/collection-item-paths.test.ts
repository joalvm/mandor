import { describe, expect, it } from 'vitest';

import { collectionItemPaths, type CollectionNode } from '../../src/index.js';

function item(path: string): CollectionNode {
    return { itemKind: 'message', kind: 'item', name: path, path, tags: [] };
}

function folder(path: string, children: CollectionNode[]): CollectionNode {
    return { children, kind: 'folder', name: path, path };
}

describe('listing the items of a collection', () => {
    it('walks into every folder and keeps the order the tree is shown in', () => {
        const tree = [
            item('a'),
            folder('f', [item('f/b'), folder('f/g', [item('f/g/c')]), item('f/d')]),
            item('e'),
        ];

        expect(collectionItemPaths(tree)).toEqual(['a', 'f/b', 'f/g/c', 'f/d', 'e']);
    });

    /** An imported set holds its items the way a folder does: a link into it must find them. */
    it('walks into a collection the same way it walks into a folder', () => {
        const set: CollectionNode = {
            children: [item('c/a'), folder('c/f', [item('c/f/b')])],
            kind: 'collection',
            name: 'c',
            path: 'c',
        };

        expect(collectionItemPaths([set, item('e')])).toEqual(['c/a', 'c/f/b', 'e']);
    });

    /** A link, a search or a session points at an item, never at the folder holding it. */
    it('leaves the folders out, empty or not', () => {
        expect(collectionItemPaths([folder('f', [folder('f/g', [])])])).toEqual([]);
    });
});
