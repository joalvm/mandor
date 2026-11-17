import { describe, expect, it } from 'vitest';

import { maskedTemplates } from '../../src/editor/template-mask.js';

describe('a template read as the value it stands for', () => {
    it('stands a bare template in for a number of the same width', () => {
        expect(maskedTemplates('{"n": {{count}}}')).toBe('{"n": 111111111}');
    });

    /** Every offset of the text survives, so a mark on the masked text lands on the real one. */
    it('keeps the width of every template, inside a string too', () => {
        const text = '{"a": "{{x}}", "b": {{y}} }';

        expect(maskedTemplates(text)).toBe('{"a": "11111", "b": 11111 }');
    });

    it('leaves a text without templates as it is', () => {
        expect(maskedTemplates('{ "a": "{ b }" }')).toBe('{ "a": "{ b }" }');
    });
});
