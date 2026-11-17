import { describe, expectTypeOf, it } from 'vitest';

import type {
    CollectionItem,
    CollectionItemEnvelope,
} from '../../src/collection/collection-item.js';

describe('the shape of an item of the collection', () => {
    it('keeps the envelope as the item without its body', () => {
        expectTypeOf<CollectionItemEnvelope>().toEqualTypeOf<Omit<CollectionItem, 'body'>>();
    });
});
