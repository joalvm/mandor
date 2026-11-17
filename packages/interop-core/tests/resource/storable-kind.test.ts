import { describe, expect, it } from 'vitest';

import { STORABLE_KINDS, storableKindOf } from '../../src/resource/storable-kind.js';

describe('storableKindOf', () => {
    it('calls a connection a connection and an item by its kind', () => {
        expect(storableKindOf({ place: 'connection', itemKind: null })).toBe('connection');
        expect(storableKindOf({ place: 'item', itemKind: 'request' })).toBe('request');
        expect(storableKindOf({ place: 'item', itemKind: 'message' })).toBe('message');
    });

    it('names no kind for an item of a kind apps do not choose between', () => {
        expect(storableKindOf({ place: 'item', itemKind: 'raro' })).toBeNull();
        expect(storableKindOf({ place: 'item', itemKind: null })).toBeNull();
    });

    it('names no kind for the structure around the leaves', () => {
        const structure = ['collection', 'doc', 'environment', 'folder', 'workspace'] as const;

        expect(structure.map((place) => storableKindOf({ place, itemKind: null }))).toEqual([
            null,
            null,
            null,
            null,
            null,
        ]);
    });

    it('lists the kinds in the order apps declare them', () => {
        expect(STORABLE_KINDS).toEqual(['connection', 'message', 'request']);
    });
});
