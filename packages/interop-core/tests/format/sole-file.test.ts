import { describe, expect, it } from 'vitest';

import { FormatInputError } from '../../src/format/format-input-error.js';
import { sniffSoleFile, soleFileOf } from '../../src/format/sole-file.js';

const ONE = { path: 'api.yaml', text: 'openapi: 3.1.0' };
const OTHER = { path: 'other.yaml', text: 'openapi: 3.1.0' };

describe('a format that reads one file', () => {
    it('hands back the file it was given', () => {
        expect(soleFileOf([ONE])).toBe(ONE);
    });

    it('refuses no file and several, saying how many it got in problems', () => {
        expect(() => soleFileOf([])).toThrow(FormatInputError);
        expect(() => soleFileOf([ONE, OTHER])).toThrow(
            expect.objectContaining({ problems: ['the format reads one file, not 2'] }),
        );
    });

    it('sniffs the text of its file and nothing else', () => {
        const sniff = sniffSoleFile((text) => text.startsWith('openapi'));

        expect(sniff([ONE])).toBe(true);
        expect(sniff([{ path: 'a.txt', text: 'hello' }])).toBe(false);
        expect(sniff([])).toBe(false);
        expect(sniff([ONE, OTHER])).toBe(false);
    });
});
