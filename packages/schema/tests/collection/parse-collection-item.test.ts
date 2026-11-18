import { describe, expect, it } from 'vitest';

import { collectionItemFields, FormatError, parseCollectionItem } from '../../src/index.js';

const created = {
    kind: 'message',
    name: 'Pedido creado',
    tags: ['pagos'],
    payload: '{"id":1}',
};

describe('parsing a collection item', () => {
    it('reads the envelope the collection understands', () => {
        const item = parseCollectionItem(created);

        expect(item.kind).toBe('message');
        expect(item.name).toBe('Pedido creado');
        expect(item.tags).toEqual(['pagos']);
    });

    /** The collection serves both apps, so what it does not understand is not its to drop. */
    it('keeps every key it does not understand in the body', () => {
        expect(parseCollectionItem(created).body).toEqual({ payload: '{"id":1}' });
    });

    it('treats an item without tags as an item with none', () => {
        expect(parseCollectionItem({ kind: 'message', name: 'Sin etiquetas' }).tags).toEqual([]);
    });

    it('reads where an imported item came from', () => {
        const imported = { ...created, origin: { kind: 'asyncapi', sourceId: 'pagos.yaml' } };

        expect(parseCollectionItem(imported).origin).toEqual({
            kind: 'asyncapi',
            sourceId: 'pagos.yaml',
        });
    });

    it('leaves the origin absent when a person wrote the item', () => {
        expect(parseCollectionItem(created).origin).toBeUndefined();
    });

    it('refuses an origin of a kind no importer writes', () => {
        const invented = { ...created, origin: { kind: 'invented', sourceId: 'x' } };

        expect(() => parseCollectionItem(invented)).toThrow(FormatError);
    });

    it('refuses an item whose kind is not one path segment', () => {
        expect(() => parseCollectionItem({ ...created, kind: '../message' })).toThrow(FormatError);
    });

    it('refuses an item with no visible name', () => {
        expect(() => parseCollectionItem({ ...created, name: '   ' })).toThrow(FormatError);
    });
});

describe('writing a collection item back', () => {
    it('puts the body beside the envelope, not under a key of its own', () => {
        expect(collectionItemFields(parseCollectionItem(created))).toEqual(created);
    });

    it('writes no tags and no origin when the item has neither', () => {
        const bare = parseCollectionItem({ kind: 'message', name: 'Sin etiquetas' });

        expect(collectionItemFields(bare)).toEqual({ kind: 'message', name: 'Sin etiquetas' });
    });

    it('writes the origin of an imported item', () => {
        const origin = { kind: 'openapi', sourceId: 'pedidos.json' };
        const item = parseCollectionItem({ ...created, origin });

        expect(collectionItemFields(item).origin).toEqual(origin);
    });
});
