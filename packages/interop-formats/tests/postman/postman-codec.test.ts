import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../src/postman/export/documents-of.js';
import { readFiles } from '../../src/postman/import/read-files.js';
import { postmanCodec } from '../../src/postman/postman-codec.js';

describe('postmanCodec', () => {
    it('reads through the import of its format', () => {
        expect(postmanCodec.read).toBe(readFiles);
    });

    it('writes through the export of its format', () => {
        expect(postmanCodec.documentsOf).toBe(documentsOf);
    });

    it('prints a document as indented JSON, which is how Postman writes it', () => {
        expect(postmanCodec.textOf({ info: { name: 'a' } })).toBe(
            JSON.stringify({ info: { name: 'a' } }, null, 2),
        );
    });
});
