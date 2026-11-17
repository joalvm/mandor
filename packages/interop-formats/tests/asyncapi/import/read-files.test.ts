import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { AsyncapiParseError } from '../../../src/asyncapi/document/asyncapi-parse-error.js';
import { readFiles } from '../../../src/asyncapi/import/read-files.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}

describe('reading an AsyncAPI import', () => {
    it('reads its one document into the name it gave itself and the resources of a workspace', async () => {
        const read = await readFiles([{ path: 'pasarela.yaml', text: textOf('pasarela-3.yaml') }]);

        expect(read.name).toBe('Pasarela');
        expect(read.resources.map((resource) => resource.place)).toEqual([
            'connection',
            'collection',
            'folder',
            'folder',
            'item',
            'item',
        ]);
    });

    it('refuses what is not an AsyncAPI document, saying why', async () => {
        await expect(
            readFiles([{ path: 'a.yaml', text: 'openapi: 3.1.0' }]),
        ).rejects.toBeInstanceOf(AsyncapiParseError);
    });

    it('refuses to read two files as one document', async () => {
        const file = { path: 'pasarela.yaml', text: textOf('pasarela-3.yaml') };

        await expect(readFiles([file, file])).rejects.toBeInstanceOf(FormatInputError);
    });
});
