import { describe, expect, it } from 'vitest';

import { collectionItemExamples } from '../../src/collection/collection-item-examples.js';
import { parseCollectionItem } from '../../src/index.js';

function requestWith(examples: unknown) {
    return parseCollectionItem({ kind: 'request', name: 'Login', examples });
}

describe('the examples an item lists in the tree', () => {
    it('is nothing for a kind that has none', () => {
        const item = parseCollectionItem({
            kind: 'message',
            name: 'Pedido',
            examples: [{ name: 'OK', status: '200' }],
        });

        expect(collectionItemExamples(item)).toBeUndefined();
    });

    it('is nothing for a request without examples', () => {
        expect(collectionItemExamples(requestWith(undefined))).toBeUndefined();
        expect(collectionItemExamples(requestWith([]))).toBeUndefined();
        expect(collectionItemExamples(requestWith('nope'))).toBeUndefined();
    });

    it('names each example by key and wears its status as the mark', () => {
        const item = requestWith([
            { name: 'Created', status: '201' },
            { name: 'Anything', status: 'default' },
        ]);

        expect(collectionItemExamples(item)).toEqual([
            { key: 'Created', name: 'Created', mark: '201' },
            { key: 'Anything', name: 'Anything', mark: 'default' },
        ]);
    });

    it('leaves the mark out when the status is not a code', () => {
        const item = requestWith([
            { name: 'A', status: '2XX' },
            { name: 'B', status: 7 },
        ]);

        expect(collectionItemExamples(item)).toEqual([
            { key: 'A', name: 'A' },
            { key: 'B', name: 'B' },
        ]);
    });

    it('drops entries that are not examples and numbers repeated names', () => {
        const item = requestWith([null, { name: 3 }, { name: 'OK' }, { name: 'OK' }]);

        expect(collectionItemExamples(item)).toEqual([
            { key: 'OK', name: 'OK' },
            { key: 'OK (2)', name: 'OK' },
        ]);
    });

    it('is nothing when every entry was dropped', () => {
        expect(collectionItemExamples(requestWith([null]))).toBeUndefined();
    });
});
