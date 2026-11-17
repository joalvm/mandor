import { describe, expect, it } from 'vitest';

import { documentYamlOf, irDiff, type WorkspaceData } from '@mandor/interop-core';

import { irToDocument } from '../../src/openapi/export/interop-to-document.js';
import { documentToInterop } from '../../src/openapi/import/document-to-interop.js';
import { openapiCodec } from '../../src/openapi/openapi-codec.js';
import { openapiFormat } from '../../src/openapi/openapi-format.js';

import { heldDocumentOf } from './support/held-document.js';

const MESSAGES: WorkspaceData = {
    name: 'Pasarela',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [
        {
            name: 'Tienda',
            settings: { variables: [], headers: [] },
            folders: [],
            items: [
                {
                    kind: 'message',
                    name: 'registrar',
                    tags: [],
                    body: { channel: 'pedidos', payload: '{}', payloadType: 'json' },
                },
            ],
        },
    ],
};

describe('OpenAPI as a format the app lists', () => {
    it('names its files for the dialogs: it reads YAML and JSON, and writes YAML', () => {
        expect(openapiFormat.label).toBe('OpenAPI');
        expect(openapiFormat.reads).toEqual(['yaml', 'yml', 'json']);
        expect(openapiFormat.writes).toEqual(['yaml', 'yml']);
    });

    it('covers a collection and asks the person for one file', () => {
        expect(openapiFormat.scopes).toEqual(['collection']);
        expect(openapiFormat.input).toBe('file');
    });

    /** The reason the export tree gives is a promise about the document, so the document keeps it. */
    it('has no place for messages: a workspace of messages writes no path', async () => {
        const codec = await openapiFormat.load();
        const [file] = codec.documentsOf(MESSAGES);

        expect(openapiFormat.unwritten).toEqual({
            message: 'messagesNotHttp',
        });
        expect(file?.document['paths']).toEqual({});
    });

    it('writes the workspace as an OpenAPI 3.1 document, and the document as its text', () => {
        const [file] = openapiCodec.documentsOf(MESSAGES);

        expect(file?.document['openapi']).toBe('3.1.0');
        expect(file === undefined ? '' : openapiCodec.textOf(file.document)).toMatch(
            /^openapi: 3\.1\.0\n/u,
        );
    });

    // What the workspace holds after an import, written and read again, is what it held: the
    // half of the round trip that is the format's. The disk half is the host's.
    it('leaves no semantic difference writing back what the workspace held', async () => {
        const held = heldDocumentOf();
        const read = await documentToInterop(documentYamlOf(irToDocument(held)));

        expect(irDiff(held, read)).toEqual([]);
    });
});
