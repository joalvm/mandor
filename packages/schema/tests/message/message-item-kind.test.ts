import { describe, expect, it } from 'vitest';

import { slugSchema } from '../../src/fields/slug-schema.js';
import { collectionItemEnvelopeSchema } from '../../src/collection/collection-item-envelope-schema.js';
import { MESSAGE_ITEM_KIND } from '../../src/message/message-item-kind.js';

describe('MESSAGE_ITEM_KIND', () => {
    it('is what a message calls itself in the envelope', () => {
        expect(MESSAGE_ITEM_KIND).toBe('message');
    });

    it('is a kind the envelope of the collection accepts', () => {
        expect(slugSchema.safeParse(MESSAGE_ITEM_KIND).success).toBe(true);
        expect(
            collectionItemEnvelopeSchema.safeParse({ kind: MESSAGE_ITEM_KIND, name: 'Hola' })
                .success,
        ).toBe(true);
    });
});
