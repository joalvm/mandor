import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import type { PostmanCollection } from '../../../src/postman/document/postman-collection-schema.js';
import { notesOf } from '../../../src/postman/import/collection-notes.js';

const info = { name: 'c', schema: 'https://x/collection/v2.1.0/collection.json' };

function collectionOf(more: Record<string, unknown>): PostmanCollection {
    return { info, item: [], ...more };
}

describe('notesOf', () => {
    it('says nothing about a collection that loses nothing', () => {
        expect(notesOf(collectionOf({ _exporter_id: 'x' }))).toEqual([]);
    });

    it('leaves nothing behind for the description of the collection, which comes in', () => {
        expect(notesOf(collectionOf({ info: { ...info, description: 'a' } }))).toEqual([]);
    });

    it.each([
        ['a collection variable', { variable: [{ key: 'a', description: 'x' }] }],
        [
            'a folder variable',
            { item: [{ name: 'f', item: [], variable: [{ key: 'a', description: 'x' }] }] },
        ],
        ['a header', { item: [{ request: { header: [{ key: 'a', description: 'x' }] } }] }],
        [
            'a query row',
            { item: [{ request: { url: { query: [{ key: 'a', description: 'x' }] } } }] },
        ],
        [
            'a path variable',
            { item: [{ request: { url: { variable: [{ key: 'a', description: 'x' }] } } }] },
        ],
    ])('says descriptions are not kept for %s', (_name, more) => {
        expect(notesOf(collectionOf(more))).toEqual([degradation('descriptionsNotKept')]);
    });

    it('does not mind rows with no description, nor a request with no url', () => {
        const item = [{ request: { header: [{ key: 'a' }] } }, { request: {} }];

        expect(notesOf(collectionOf({ item }))).toEqual([]);
    });

    it('names every root key nothing reads, once each, in the order they came', () => {
        const notes = notesOf(collectionOf({ protocolProfileBehavior: {}, custom: 1, _skip: 2 }));

        expect(notes).toEqual([
            degradation('collectionKeyNotImported', { key: 'protocolProfileBehavior' }),
            degradation('collectionKeyNotImported', { key: 'custom' }),
        ]);
    });
});
