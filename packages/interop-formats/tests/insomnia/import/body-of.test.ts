import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import type { InsomniaBody } from '../../../src/insomnia/document/insomnia-tree.js';
import { requestBodyOf } from '../../../src/insomnia/import/body-of.js';
import { rowOf } from '../support/trees.js';

function bodyOf(mimeType: string, rest: Partial<InsomniaBody> = {}): InsomniaBody {
    return { mimeType, text: '', fileName: '', params: [], ...rest };
}

describe('requestBodyOf: bodies that are text', () => {
    it('has no body when the request wrote none', () => {
        expect(requestBodyOf(undefined)).toEqual({ body: { type: 'none' }, degradations: [] });
    });

    it.each([
        ['application/json', 'json'],
        ['application/xml', 'xml'],
        ['text/plain', 'text'],
    ])('keeps the text of a %s body as a %s body', (mimeType, type) => {
        expect(requestBodyOf(bodyOf(mimeType, { text: 'x' }))).toEqual({
            body: { type, content: 'x' },
            degradations: [],
        });
    });

    it('reads the type without its parameters or its case', () => {
        expect(
            requestBodyOf(bodyOf('Application/JSON; charset=utf-8', { text: '{}' })).body,
        ).toEqual({
            type: 'json',
            content: '{}',
        });
    });

    it('keeps the text of a type Mandor has no word for as text, and says so', () => {
        expect(requestBodyOf(bodyOf('application/vnd.api+json', { text: '{}' }))).toEqual({
            body: { type: 'text', content: '{}' },
            degradations: [degradation('bodyTypeAsText', { type: 'application/vnd.api+json' })],
        });
    });

    it('has no body for a type Mandor has no word for and that holds nothing', () => {
        expect(requestBodyOf(bodyOf(''))).toEqual({ body: { type: 'none' }, degradations: [] });
    });
});

describe('requestBodyOf: bodies that are rows', () => {
    it('keeps the fields of a urlencoded body with their switch', () => {
        const result = requestBodyOf(
            bodyOf('application/x-www-form-urlencoded', {
                params: [rowOf('a', '1'), rowOf('b', '2', { disabled: true })],
            }),
        );

        expect(result.body).toEqual({
            type: 'urlencoded',
            fields: [
                { key: 'a', value: '1', enabled: true },
                { key: 'b', value: '2', enabled: false },
            ],
        });
    });

    it('keeps the text and file fields of a form, and asks for the file to be copied', () => {
        const result = requestBodyOf(
            bodyOf('multipart/form-data', {
                params: [
                    rowOf('name', 'ana'),
                    rowOf('avatar', '', { type: 'file', fileName: 'C:\\fotos\\ana.png' }),
                    rowOf('old', 'x', { disabled: true }),
                ],
            }),
        );

        expect(result.body).toEqual({
            type: 'form',
            fields: [
                { key: 'name', value: 'ana', enabled: true, kind: 'text' },
                { key: 'avatar', value: 'ana.png', enabled: true, kind: 'file' },
                { key: 'old', value: 'x', enabled: false, kind: 'text' },
            ],
        });
        expect(result.degradations).toEqual([
            degradation('fileFieldToCopy', { name: 'ana.png', key: 'avatar' }),
        ]);
    });

    it('leaves out a file field that names no file', () => {
        const result = requestBodyOf(
            bodyOf('multipart/form-data', { params: [rowOf('avatar', '', { type: 'file' })] }),
        );

        expect(result.body).toEqual({ type: 'form', fields: [] });
        expect(result.degradations).toEqual([
            degradation('fileFieldWithoutFile', { key: 'avatar' }),
        ]);
    });
});

describe('requestBodyOf: a file', () => {
    it('keeps the name of the file and asks for it to be copied to the repo root', () => {
        const result = requestBodyOf(
            bodyOf('application/octet-stream', { fileName: '/home/a/data.bin' }),
        );

        expect(result).toEqual({
            body: { type: 'binary', file: 'data.bin' },
            degradations: [degradation('fileToCopy', { name: 'data.bin' })],
        });
    });

    it('has no body when no file is named', () => {
        expect(requestBodyOf(bodyOf('application/octet-stream'))).toEqual({
            body: { type: 'none' },
            degradations: [degradation('fileBodyWithoutFile')],
        });
    });
});

describe('requestBodyOf: GraphQL', () => {
    function graphql(text: string): InsomniaBody {
        return bodyOf('application/graphql', { text });
    }

    it('splits the JSON of the body into query, variables and operation name', () => {
        const text = JSON.stringify({
            query: '{ pets { id } }',
            variables: { first: 1 },
            operationName: 'Pets',
        });

        expect(requestBodyOf(graphql(text)).body).toEqual({
            type: 'graphql',
            query: '{ pets { id } }',
            variables: JSON.stringify({ first: 1 }, null, 2),
            operationName: 'Pets',
        });
    });

    it('keeps variables that were already text, and no operation name when there is none', () => {
        const text = JSON.stringify({ query: '{ a }', variables: '{"a":1}', operationName: '' });

        expect(requestBodyOf(graphql(text)).body).toEqual({
            type: 'graphql',
            query: '{ a }',
            variables: '{"a":1}',
        });
    });

    it('has empty variables when the body wrote none', () => {
        expect(requestBodyOf(graphql('{"query":"{ a }"}')).body).toEqual({
            type: 'graphql',
            query: '{ a }',
            variables: '',
        });
    });

    it.each(['{ pets { id } }', '{"variables":{}}', '[1]'])(
        'takes %s as the query when it is not the JSON of a query',
        (text) => {
            expect(requestBodyOf(graphql(text)).body).toEqual({
                type: 'graphql',
                query: text,
                variables: '',
            });
        },
    );
});
