import { describe, expect, it } from 'vitest';

import { itemOriginSchema } from '../../src/collection/item-origin-schema.js';

describe('itemOriginSchema', () => {
    it('names the importer and the document the item came from', () => {
        const origin = { kind: 'openapi', sourceId: 'Petstore API v3.json' };

        expect(itemOriginSchema.parse(origin)).toEqual(origin);
    });

    it('carries the fingerprint of what the import wrote, when there is one', () => {
        const origin = { kind: 'bruno', sourceId: 'a.bru', fingerprint: 'abc123' };

        expect(itemOriginSchema.parse(origin)).toEqual(origin);
    });

    it('does not ask the source to be an id: a url or a file name is neither lowercase nor dotless', () => {
        const origin = { kind: 'postman', sourceId: 'https://api.example.com/Collection.json' };

        expect(itemOriginSchema.safeParse(origin).success).toBe(true);
    });

    it('refuses a source or a fingerprint that is blank: it identifies nothing', () => {
        expect(itemOriginSchema.safeParse({ kind: 'har', sourceId: '  ' }).success).toBe(false);
        expect(
            itemOriginSchema.safeParse({ kind: 'har', sourceId: 'a.har', fingerprint: '' }).success,
        ).toBe(false);
    });

    it('refuses a kind of importer that does not exist, `manual` included', () => {
        expect(itemOriginSchema.safeParse({ kind: 'manual', sourceId: 'x' }).success).toBe(false);
        expect(itemOriginSchema.safeParse({ kind: 'swagger', sourceId: 'x' }).success).toBe(false);
    });
});
