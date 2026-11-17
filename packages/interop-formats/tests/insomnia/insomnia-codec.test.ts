import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../src/insomnia/export/documents-of.js';
import { readFiles } from '../../src/insomnia/import/read-files.js';
import { insomniaCodec } from '../../src/insomnia/insomnia-codec.js';

describe('insomniaCodec', () => {
    it('reads through the import of its format', () => {
        expect(insomniaCodec.read).toBe(readFiles);
    });

    it('writes through the export of its format', () => {
        expect(insomniaCodec.documentsOf).toBe(documentsOf);
    });

    it('prints a document as YAML, which is how Insomnia 5 writes it', () => {
        expect(insomniaCodec.textOf({ type: 'collection.insomnia.rest/5.0', collection: [] })).toBe(
            'type: collection.insomnia.rest/5.0\ncollection: []\n',
        );
    });
});
