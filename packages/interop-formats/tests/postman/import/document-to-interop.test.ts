import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { documentToInterop } from '../../../src/postman/import/document-to-interop.js';
import { fixtureText } from '../support/fixture.js';

describe('documentToInterop', () => {
    it('sends a collection to the collection mapper', () => {
        const document = documentToInterop(
            parsePostmanDocument(fixtureText('collection-v2.1.json')),
        );

        expect(document.operations.length).toBeGreaterThan(0);
        expect(document.environments).toBeUndefined();
    });

    it('sends an environment and globals to the environment mapper', () => {
        const environment = documentToInterop(
            parsePostmanDocument(fixtureText('environment.json')),
        );
        const globals = documentToInterop(parsePostmanDocument(fixtureText('globals.json')));

        expect(environment.environments?.[0]?.extras).toEqual({ scope: 'environment' });
        expect(globals.environments?.[0]?.extras).toEqual({ scope: 'globals' });
    });
});
