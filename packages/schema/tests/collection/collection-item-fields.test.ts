import { describe, expect, it } from 'vitest';

import type { CollectionItem } from '../../src/collection/collection-item.js';
import { collectionItemFields } from '../../src/collection/collection-item-fields.js';

const ITEM: CollectionItem = {
    kind: 'request',
    name: 'Crear pedido',
    tags: [],
    body: { method: 'POST', url: '{{host}}/pedidos' },
};

describe('collectionItemFields', () => {
    it('writes the envelope first and the keys of the kind at the same level', () => {
        const fields = collectionItemFields(ITEM);

        expect(fields).toEqual({
            kind: 'request',
            name: 'Crear pedido',
            method: 'POST',
            url: '{{host}}/pedidos',
        });
        expect(Object.keys(fields).slice(0, 2)).toEqual(['kind', 'name']);
    });

    it('leaves out an empty list of tags: nobody decided it', () => {
        expect(collectionItemFields(ITEM)).not.toHaveProperty('tags');
    });

    it('writes the tags when there are some', () => {
        expect(collectionItemFields({ ...ITEM, tags: ['pagos'] })).toMatchObject({
            tags: ['pagos'],
        });
    });

    it('leaves out an absent origin and writes a present one', () => {
        const origin = { kind: 'har', sourceId: 'captura.har' } as const;

        expect(collectionItemFields(ITEM)).not.toHaveProperty('origin');
        expect(collectionItemFields({ ...ITEM, origin })).toMatchObject({ origin });
    });

    it('does not nest the body under a key of its own', () => {
        expect(collectionItemFields(ITEM)).not.toHaveProperty('body');
    });
});
