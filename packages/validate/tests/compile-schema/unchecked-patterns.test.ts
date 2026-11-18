import { describe, expect, it } from 'vitest';

import { uncheckedPatternRanges } from '../../src/compile-schema/unchecked-patterns.js';

/** The stretch of the text that `written` takes, the first time it is there. */
function rangeOf(text: string, written: string): { from: number; to: number } {
    const from = text.indexOf(written);

    return { from, to: from + written.length };
}

describe('where a schema writes the patterns no check reads', () => {
    it('lands on the text of each one, wherever its schema sits', () => {
        const text = [
            '{',
            '  "pattern": "^(?=.*[0-9]).{8,}$",',
            '  "properties": { "id": { "pattern": "^[0-9]+$" } },',
            '  // the names of the object',
            '  "propertyNames": { "pattern": "^(a|aa){1,40}$" },',
            '}',
        ].join('\n');

        expect(uncheckedPatternRanges(text)).toEqual([
            rangeOf(text, '"^(?=.*[0-9]).{8,}$"'),
            rangeOf(text, '"^(a|aa){1,40}$"'),
        ]);
    });

    it('lands nowhere in a schema whose patterns are all checked', () => {
        expect(uncheckedPatternRanges('{"pattern": "^(a+)+$"}')).toEqual([]);
    });

    it('lands nowhere in a text with no schema to read', () => {
        expect(uncheckedPatternRanges('')).toEqual([]);
    });

    /** A key written twice is read as the checker reads it: the last one stands. */
    it('lands on the pattern the checker reads when the key is written twice', () => {
        const text = '{"pattern": "^(a|aa){1,40}$", "pattern": "^a$"}';

        expect(uncheckedPatternRanges(text)).toEqual([]);
    });
});
