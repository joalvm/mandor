import { describe, expect, it } from 'vitest';

import { valuePathOf } from '../../src/editor/value-path.js';

describe('the place a pointer names inside a value', () => {
    it('says the value itself as the root alone', () => {
        expect(valuePathOf('')).toEqual({ leaf: '$', trail: '' });
    });

    it('reaches a property with a dot, as code would', () => {
        expect(valuePathOf('/data/expire')).toEqual({ leaf: '.expire', trail: '$.data' });
    });

    it('reaches an element of a list by its index', () => {
        expect(valuePathOf('/items/0/name')).toEqual({ leaf: '.name', trail: '$.items[0]' });
        expect(valuePathOf('/12')).toEqual({ leaf: '[12]', trail: '$' });
    });

    it('quotes a key no dot can carry, once its escapes are read back', () => {
        expect(valuePathOf('/headers/content-type')).toEqual({
            leaf: '["content-type"]',
            trail: '$.headers',
        });
        expect(valuePathOf('/a~1b/~01')).toEqual({ leaf: '["~1"]', trail: '$["a/b"]' });
        expect(valuePathOf('/007')).toEqual({ leaf: '["007"]', trail: '$' });
    });
});
