import { describe, expect, it } from 'vitest';

import { harCodec } from '../../src/har/har-codec.js';
import { readFiles } from '../../src/har/import/read-files.js';

describe('harCodec', () => {
    it('reads through the import of its format', () => {
        expect(harCodec.read).toBe(readFiles);
    });

    it('does not export: Mandor only imports HAR', () => {
        expect(() => harCodec.documentsOf({} as never)).toThrow('HAR is only imported');
        expect(() => harCodec.textOf({})).toThrow('HAR is only imported');
    });
});
