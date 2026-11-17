import { describe, expect, it } from 'vitest';

import { irEqual } from '../../src/ir/ir-equal.js';

describe('saying whether two unknown-shaped values say the same', () => {
    it('compares records by what they name, whatever the order', () => {
        expect(irEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
        expect(irEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('keeps the order of a list as content', () => {
        expect(irEqual(['a', 'b'], ['b', 'a'])).toBe(false);
    });

    it('leaves a ref key out on both sides: it is addressing, not content', () => {
        expect(
            irEqual(
                { $ref: '#/channels/a/messages/x', payload: { type: 'object' } },
                { $ref: '#/components/messages/x', payload: { type: 'object' } },
            ),
        ).toBe(true);
    });

    /**
     * A model is kept as JSON, and JSON drops a key whose value is `undefined`. Counting that key
     * would call a model different from the same model read back from disk.
     */
    it('reads a key that holds undefined as a key that is not there', () => {
        expect(irEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
        expect(irEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
        expect(irEqual({ a: 1, b: undefined }, { a: 1, b: 2 })).toBe(false);
    });

    it('answers no when only one side is a record', () => {
        expect(irEqual({ a: 1 }, null)).toBe(false);
        expect(irEqual('a', 'a')).toBe(true);
    });
});
