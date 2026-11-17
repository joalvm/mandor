import { describe, expect, it } from 'vitest';

import { diffTextsOf } from '../../../../../../src/renderer/features/requests/lib/compare/diff-texts.js';

describe('the texts of the diff editor (diff-texts)', () => {
    it('lays JSON out the same way on both sides', () => {
        const texts = diffTextsOf('{"a":1}', '{ "a" : 2 }', true);

        expect(texts.expected).toBe('{\n  "a": 1\n}');
        expect(texts.received).toBe('{\n  "a": 2\n}');
    });

    it('keeps the scalars at the root and the nulls', () => {
        expect(diffTextsOf('null', '5', true)).toEqual({ expected: 'null', received: '5' });
    });

    it('hands any other text over as it is', () => {
        expect(diffTextsOf('<a/>', 'hello', false)).toEqual({
            expected: '<a/>',
            received: 'hello',
        });
    });
});
