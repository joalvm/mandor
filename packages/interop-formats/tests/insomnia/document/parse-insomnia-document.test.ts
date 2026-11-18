import { describe, expect, it } from 'vitest';

import { InsomniaParseError } from '../../../src/insomnia/document/insomnia-parse-error.js';
import { parseInsomniaDocument } from '../../../src/insomnia/document/parse-insomnia-document.js';
import { fixtureText } from '../support/fixture.js';

describe('parseInsomniaDocument', () => {
    it('reads a v4 export and a v5 collection into the same tree', () => {
        const fromV4 = parseInsomniaDocument(fixtureText('collection-v4.json'));
        const fromV5 = parseInsomniaDocument(fixtureText('collection-v5.yaml'));

        expect(fromV4).toHaveLength(1);
        expect(fromV5).toHaveLength(1);
        expect(fromV4[0]?.name).toBe(fromV5[0]?.name);
        expect(fromV4[0]?.environments.map((each) => each.name)).toEqual(
            fromV5[0]?.environments.map((each) => each.name),
        );
    });

    it('reads a v4 export written as YAML', () => {
        const text =
            '_type: export\n__export_format: 4\nresources:\n  - { _id: w, _type: workspace, name: Y }\n';

        expect(parseInsomniaDocument(text)).toMatchObject([{ name: 'Y' }]);
    });

    it('refuses a text that is neither JSON nor YAML', () => {
        expect(() => parseInsomniaDocument('{ not: [valid')).toThrow(
            'The file is neither JSON nor YAML',
        );
        expect(() => parseInsomniaDocument('[1]')).toThrow(InsomniaParseError);
    });

    it('refuses what the sniff refuses', () => {
        expect(() => parseInsomniaDocument('{"info":{}}')).toThrow('not an Insomnia export');
    });
});
