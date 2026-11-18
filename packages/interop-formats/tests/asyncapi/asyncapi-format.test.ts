import { describe, expect, it } from 'vitest';

import { documentYamlOf, irDiff, type InteropDocument } from '@mandor/interop-core';

import { asyncapiCodec } from '../../src/asyncapi/asyncapi-codec.js';
import { asyncapiFormat } from '../../src/asyncapi/asyncapi-format.js';
import { irToDocument } from '../../src/asyncapi/export/interop-to-document.js';
import { documentToInterop } from '../../src/asyncapi/import/document-to-interop.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`./fixtures/${fixture}`, import.meta.url)), 'utf8');
}

describe('AsyncAPI as a format the app lists', () => {
    it('names its files for the dialogs: it reads YAML and JSON, and writes YAML', () => {
        expect(asyncapiFormat.label).toBe('AsyncAPI');
        expect(asyncapiFormat.reads).toEqual(['yaml', 'yml', 'json']);
        expect(asyncapiFormat.writes).toEqual(['yaml', 'yml']);
    });

    it('covers a collection and asks the person for one file', () => {
        expect(asyncapiFormat.scopes).toEqual(['collection']);
        expect(asyncapiFormat.input).toBe('file');
    });

    it('leaves nothing out of the tree an export offers: every kind of node has a place', () => {
        expect(asyncapiFormat.unwritten).toEqual({});
    });

    it('writes the workspace as an AsyncAPI 3 document, and the document as its text', () => {
        const [file] = asyncapiCodec.documentsOf({
            name: 'Pasarela',
            connections: [],
            environments: [],
            globals: [],
            docs: [],
            collections: [],
        });

        expect(file?.document['asyncapi']).toBe('3.0.0');
        expect(file === undefined ? '' : asyncapiCodec.textOf(file.document)).toMatch(
            /^asyncapi: 3\.0\.0\n/u,
        );
    });

    // What the workspace holds after an import, written and read again, is what it held: the
    // half of the round trip that is the format's. The disk half is the host's.
    it.each(['ida-vuelta-3.held.json', 'ida-vuelta-2.held.json'])(
        'leaves no semantic difference writing back what %s holds',
        async (fixture) => {
            // A workspace names no source: the held model carries an empty identity, which the
            // schema of an imported document would refuse.
            const held = JSON.parse(textOf(fixture)) as InteropDocument;
            const read = await documentToInterop(documentYamlOf(irToDocument(held)));

            expect(irDiff(held, read)).toEqual([]);
        },
    );
});
