import { describe, expect, it } from 'vitest';

import { ITEM_ORIGIN_KINDS } from '../../src/collection/item-origin.js';
import { itemOriginSchema } from '../../src/collection/item-origin-schema.js';

describe('ITEM_ORIGIN_KINDS', () => {
    it('lists the importers that can write an item', () => {
        expect([...ITEM_ORIGIN_KINDS]).toEqual([
            'mandor',
            'asyncapi',
            'bruno',
            'har',
            'insomnia',
            'openapi',
            'postman',
        ]);
    });

    it('has no `manual` kind: an item nobody imported has no origin at all', () => {
        expect(ITEM_ORIGIN_KINDS).not.toContain('manual');
    });

    it.each(ITEM_ORIGIN_KINDS)('lets the schema read an item that came from %s', (kind) => {
        expect(itemOriginSchema.safeParse({ kind, sourceId: 'x' }).success).toBe(true);
    });
});
