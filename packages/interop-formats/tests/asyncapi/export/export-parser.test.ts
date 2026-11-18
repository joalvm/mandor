import { describe, expect, it } from 'vitest';

import { documentToInterop } from '../../../src/asyncapi/import/document-to-interop.js';
import { documentYamlOf } from '@mandor/interop-core';
import { irToDocument } from '../../../src/asyncapi/export/interop-to-document.js';
import { parseAsyncapiDocument } from '../../../src/asyncapi/document/parse-asyncapi-document.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}

/** The door of the phase: what the writer produces, the official parser reads without a word. */
describe('the document the writer produces', () => {
    it('is one the official parser reads when it came from a 3.x document', async () => {
        const ir = await documentToInterop(textOf('pasarela-3.yaml'));
        const text = documentYamlOf(irToDocument(ir));

        await expect(parseAsyncapiDocument(text)).resolves.toBeTruthy();
    });

    it('is one the official parser reads when it came from a 2.x document', async () => {
        const ir = await documentToInterop(textOf('pasarela-2.yaml'));
        const text = documentYamlOf(irToDocument(ir));

        await expect(parseAsyncapiDocument(text)).resolves.toBeTruthy();
    });
});
