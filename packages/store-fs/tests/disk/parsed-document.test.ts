import { describe, expect, it } from 'vitest';

import { parsedDocument } from '../../src/disk/parsed-document.js';

describe('the YAML document of a text (parsed-document)', () => {
    it('gives the document of a text that parses', () => {
        expect(parsedDocument('a: 1\n').get('a')).toBe(1);
    });

    it('throws the first syntax error instead of leaving it in the document', () => {
        expect(() => parsedDocument('a: [1, 2\nb: : :')).toThrow();
    });
});
