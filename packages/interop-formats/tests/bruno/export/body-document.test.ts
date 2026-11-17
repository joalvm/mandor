import { describe, expect, it } from 'vitest';

import { bodyDocumentOf } from '../../../src/bruno/export/body-document.js';

describe('bodyDocumentOf', () => {
    it('writes no body for a request that sends none', () => {
        expect(bodyDocumentOf({ type: 'none' })).toEqual({ kind: 'http', body: undefined });
    });

    it.each(['json', 'text', 'xml'] as const)('writes the text of a %s body', (type) => {
        expect(bodyDocumentOf({ type, content: 'x' })).toEqual({
            kind: 'http',
            body: { type, data: 'x' },
        });
    });

    it('writes the fields of a urlencoded body as rows, and leaves out one with no name', () => {
        expect(
            bodyDocumentOf({
                type: 'urlencoded',
                fields: [
                    { key: 'a', value: '1', enabled: true },
                    { key: 'b', value: '2', enabled: false },
                    { key: '', value: '3', enabled: true },
                ],
            }),
        ).toEqual({
            kind: 'http',
            body: {
                type: 'form-urlencoded',
                data: [
                    { name: 'a', value: '1' },
                    { name: 'b', value: '2', disabled: true },
                ],
            },
        });
    });

    it('writes the text and the file fields of a form, the file as a list of paths', () => {
        expect(
            bodyDocumentOf({
                type: 'form',
                fields: [
                    { key: 'name', value: 'ana', enabled: true, kind: 'text' },
                    { key: 'avatar', value: 'ana.png', enabled: true, kind: 'file' },
                    { key: 'old', value: 'x', enabled: false, kind: 'text' },
                    { key: '', value: 'y', enabled: true, kind: 'text' },
                ],
            }),
        ).toEqual({
            kind: 'http',
            body: {
                type: 'multipart-form',
                data: [
                    { name: 'name', type: 'text', value: 'ana' },
                    { name: 'avatar', type: 'file', value: ['ana.png'] },
                    { name: 'old', type: 'text', value: 'x', disabled: true },
                ],
            },
        });
    });

    it('writes the file of a binary body as the one selected', () => {
        expect(bodyDocumentOf({ type: 'binary', file: 'data.bin' })).toEqual({
            kind: 'http',
            body: {
                type: 'file',
                data: [
                    {
                        filePath: 'data.bin',
                        contentType: 'application/octet-stream',
                        selected: true,
                    },
                ],
            },
        });
    });

    it('makes a GraphQL request of a body that holds a query', () => {
        expect(
            bodyDocumentOf({
                type: 'graphql',
                query: '{ a }',
                variables: '{"a":1}',
                operationName: 'A',
            }),
        ).toEqual({ kind: 'graphql', body: { query: '{ a }', variables: '{"a":1}' } });
    });
});
