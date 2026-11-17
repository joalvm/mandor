import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { OpenapiParseError } from '../../../src/openapi/document/openapi-parse-error.js';
import { readFiles } from '../../../src/openapi/import/read-files.js';
import { fixtureText } from '../support/fixture-text.js';

describe('reading an OpenAPI import', () => {
    it('reads its one document into the name it gave itself and the resources of a workspace', async () => {
        const read = await readFiles(
            [{ path: 'petstore.json', text: fixtureText('petstore-3.0.json') }],
            'workspace',
        );
        const places = read.resources.map((resource) => resource.place);

        expect(read.name).toBe('Petstore');
        expect(places).toContain('item');
        expect(places).toContain('environment');
    });

    it('starts the requests of a collection from the server of the document, not from an environment', async () => {
        const read = await readFiles(
            [{ path: 'petstore.json', text: fixtureText('petstore-3.0.json') }],
            'collection',
        );
        const urls = read.resources.flatMap((resource) =>
            resource.place === 'item' ? [String(resource.fields['url'])] : [],
        );

        expect(urls).toContain('https://petstore.example.com/v1/pets');
        expect(urls.some((url) => url.includes('{{baseUrl}}'))).toBe(false);
    });

    it('refuses what is not an OpenAPI document, saying why', async () => {
        await expect(
            readFiles([{ path: 'a.json', text: '[]' }], 'workspace'),
        ).rejects.toBeInstanceOf(OpenapiParseError);
    });

    it('refuses to read two files as one document', async () => {
        const file = { path: 'petstore.json', text: fixtureText('petstore-3.0.json') };

        await expect(readFiles([file, file], 'workspace')).rejects.toBeInstanceOf(FormatInputError);
    });
});
