import { describe, expect, it } from 'vitest';

import { FormatError, parseCollectionsFile } from '../../src/index.js';

describe('parsing the root of the collection', () => {
    it('reads the order of the top level', () => {
        expect(parseCollectionsFile({ order: ['pedidos'] })).toEqual({
            order: ['pedidos'],
            origin: undefined,
        });
    });

    it('treats an empty file as a collection nobody has arranged', () => {
        expect(parseCollectionsFile({}).order).toEqual([]);
    });

    it('reads where a whole imported collection came from', () => {
        const origin = { kind: 'postman', sourceId: 'pagos.postman_collection.json' };

        expect(parseCollectionsFile({ origin }).origin).toEqual(origin);
    });

    it('refuses an origin with no source to be idempotent against', () => {
        expect(() => parseCollectionsFile({ origin: { kind: 'postman', sourceId: '' } })).toThrow(
            FormatError,
        );
    });
});
