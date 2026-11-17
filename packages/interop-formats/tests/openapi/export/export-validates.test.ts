import { documentYamlOf } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parseOpenapiDocument } from '../../../src/openapi/document/parse-openapi-document.js';
import { irToDocument } from '../../../src/openapi/export/interop-to-document.js';
import { documentToInterop } from '../../../src/openapi/import/document-to-interop.js';
import { heldDocumentOf } from '../support/held-document.js';
import { fixtureText } from '../support/fixture-text.js';

describe('the document the export writes, as a reader of the format receives it', () => {
    it('validates as the OpenAPI document of the workspace it describes', async () => {
        const text = documentYamlOf(irToDocument(heldDocumentOf()));

        await expect(parseOpenapiDocument(text)).resolves.toBeTruthy();
    });

    it('validates as the OpenAPI document a 3.0 import describes', async () => {
        const document = await documentToInterop(fixtureText('petstore-3.0.json'));
        const text = documentYamlOf(irToDocument(document));

        await expect(parseOpenapiDocument(text)).resolves.toBeTruthy();
    });
});
