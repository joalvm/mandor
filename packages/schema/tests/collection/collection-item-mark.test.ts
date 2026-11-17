import { describe, expect, it } from 'vitest';

import { collectionItemMark, parseCollectionItem } from '../../src/index.js';

describe('the mark an item wears in the tree', () => {
    it('is the method of a request', () => {
        const item = parseCollectionItem({ kind: 'request', name: 'Login', method: 'POST' });

        expect(collectionItemMark(item)).toBe('POST');
    });

    it('is nothing for a kind that wears none', () => {
        const item = parseCollectionItem({ kind: 'message', name: 'Pedido', method: 'POST' });

        expect(collectionItemMark(item)).toBeUndefined();
    });

    /** The tree draws what the body says only when it is a method; anything else is no mark. */
    it('is nothing for a request whose method is not one', () => {
        const lower = parseCollectionItem({ kind: 'request', name: 'Login', method: 'post' });
        const missing = parseCollectionItem({ kind: 'request', name: 'Login' });

        expect(collectionItemMark(lower)).toBeUndefined();
        expect(collectionItemMark(missing)).toBeUndefined();
    });
});
