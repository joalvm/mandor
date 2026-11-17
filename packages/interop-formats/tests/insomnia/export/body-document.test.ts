import type { RequestBody } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type { InsomniaBody } from '../../../src/insomnia/document/insomnia-tree.js';
import { bodyDocumentOf } from '../../../src/insomnia/export/body-document.js';
import { requestBodyOf } from '../../../src/insomnia/import/body-of.js';

function textOf(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

/** A body document as the import reads it: the same words, in the shape of the tree. */
function insomniaBodyOf(document: Record<string, unknown> | undefined): InsomniaBody {
    const rows = Array.isArray(document?.['params'])
        ? (document['params'] as Record<string, unknown>[])
        : [];

    return {
        mimeType: textOf(document?.['mimeType']),
        text: textOf(document?.['text']),
        fileName: textOf(document?.['fileName']),
        params: rows.map((row) => ({
            name: textOf(row['name']),
            value: textOf(row['value']),
            disabled: row['disabled'] === true,
            type: textOf(row['type']),
            fileName: textOf(row['fileName']),
        })),
    };
}

describe('bodyDocumentOf', () => {
    it('writes no body for a request that sends none', () => {
        expect(bodyDocumentOf({ type: 'none' })).toBeUndefined();
    });

    it.each([
        ['json', 'application/json'],
        ['text', 'text/plain'],
        ['xml', 'application/xml'],
    ] as const)('writes a %s body as %s text', (type, mimeType) => {
        expect(bodyDocumentOf({ type, content: '{{a}}' })).toEqual({ mimeType, text: '{{a}}' });
    });

    it('writes the fields of a urlencoded body as rows', () => {
        expect(
            bodyDocumentOf({
                type: 'urlencoded',
                fields: [
                    { key: 'a', value: '1', enabled: true },
                    { key: 'b', value: '2', enabled: false },
                ],
            }),
        ).toEqual({
            mimeType: 'application/x-www-form-urlencoded',
            params: [
                { name: 'a', value: '1' },
                { name: 'b', value: '2', disabled: true },
            ],
        });
    });

    it('writes the text and file fields of a form, leaving out a field with no name', () => {
        expect(
            bodyDocumentOf({
                type: 'form',
                fields: [
                    { key: 'name', value: 'ana', enabled: true, kind: 'text' },
                    { key: 'avatar', value: 'ana.png', enabled: false, kind: 'file' },
                    { key: '', value: 'x', enabled: true, kind: 'text' },
                ],
            }),
        ).toEqual({
            mimeType: 'multipart/form-data',
            params: [
                { name: 'name', value: 'ana' },
                { name: 'avatar', value: '', type: 'file', fileName: 'ana.png', disabled: true },
            ],
        });
    });

    it('writes the file of a binary body', () => {
        expect(bodyDocumentOf({ type: 'binary', file: 'data.bin' })).toEqual({
            mimeType: 'application/octet-stream',
            fileName: 'data.bin',
        });
    });

    it('writes a GraphQL body as the JSON of the query, with the variables as an object', () => {
        const document = bodyDocumentOf({
            type: 'graphql',
            query: '{ pets }',
            variables: '{"first":1}',
            operationName: 'Pets',
        });

        expect(document?.['mimeType']).toBe('application/graphql');
        expect(JSON.parse(String(document?.['text']))).toEqual({
            query: '{ pets }',
            variables: { first: 1 },
            operationName: 'Pets',
        });
    });

    it.each(['', 'not json'])('writes empty variables when the variables are %j', (variables) => {
        const document = bodyDocumentOf({ type: 'graphql', query: '{ a }', variables });

        expect(JSON.parse(String(document?.['text']))).toEqual({ query: '{ a }', variables: {} });
    });

    it.each<RequestBody>([
        { type: 'json', content: '{"a":1}' },
        { type: 'text', content: 'plain' },
        { type: 'xml', content: '<a/>' },
        { type: 'urlencoded', fields: [{ key: 'a', value: '1', enabled: false }] },
        {
            type: 'form',
            fields: [
                { key: 'n', value: 'ana', enabled: true, kind: 'text' },
                { key: 'f', value: 'a.png', enabled: true, kind: 'file' },
            ],
        },
        { type: 'binary', file: 'data.bin' },
        { type: 'graphql', query: '{ a }', variables: '{\n  "x": 1\n}', operationName: 'Op' },
    ])('reads back as the same body when the import reads what it wrote: %j', (body) => {
        const read = requestBodyOf(insomniaBodyOf(bodyDocumentOf(body)));

        expect(read.body).toEqual(body);
    });
});
