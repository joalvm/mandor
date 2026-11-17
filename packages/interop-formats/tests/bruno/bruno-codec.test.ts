import { describe, expect, it } from 'vitest';

import { brunoCodec } from '../../src/bruno/bruno-codec.js';
import { documentsOf } from '../../src/bruno/export/documents-of.js';
import { readFiles } from '../../src/bruno/import/read-files.js';

describe('brunoCodec', () => {
    it('reads through the import of its format', () => {
        expect(brunoCodec.read).toBe(readFiles);
    });

    it('writes through the export of its format', () => {
        expect(brunoCodec.documentsOf).toBe(documentsOf);
    });

    it('prints a document as YAML, which is how OpenCollection is written', () => {
        expect(brunoCodec.textOf({ opencollection: '1.0.0', info: { name: 'Tienda' } })).toBe(
            'opencollection: 1.0.0\ninfo:\n  name: Tienda\n',
        );
    });
});
