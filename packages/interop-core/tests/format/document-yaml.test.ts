import { describe, expect, it } from 'vitest';

import { parse } from 'yaml';

import { documentYamlOf } from '../../src/format/document-yaml.js';

describe('serializing the document as YAML', () => {
    it('answers text a YAML reader turns back into the same document', () => {
        const document = {
            asyncapi: '3.0.0',
            info: { title: 'Pasarela', version: '1.0.0' },
        };

        expect(parse(documentYamlOf(document))).toEqual(document);
    });

    it('says which format and version the document speaks, at the top', () => {
        expect(documentYamlOf({ asyncapi: '3.0.0' }).startsWith('asyncapi: 3.0.0')).toBe(true);
    });
});
