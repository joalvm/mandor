import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestBodyOf } from '../../../src/bruno/import/body-of.js';
import { bodyNode } from '../support/trees.js';

const FIELD = { name: 'a', value: '1', disabled: false, file: '' };

describe('requestBodyOf: bodies that are text', () => {
    it('has no body when the request wrote none', () => {
        expect(requestBodyOf(undefined)).toEqual({ body: { type: 'none' }, degradations: [] });
    });

    it.each(['json', 'xml', 'text'])('keeps the text of a %s body', (type) => {
        expect(requestBodyOf(bodyNode(type, { text: 'x' }))).toEqual({
            body: { type, content: 'x' },
            degradations: [],
        });
    });

    it('keeps a SPARQL body as text, and says so', () => {
        expect(requestBodyOf(bodyNode('sparql', { text: 'ASK {}' }))).toEqual({
            body: { type: 'text', content: 'ASK {}' },
            degradations: [degradation('bodySparqlAsText')],
        });
    });

    it('has no body for a kind Mandor has no word for', () => {
        expect(requestBodyOf(bodyNode('protobuf'))).toEqual({
            body: { type: 'none' },
            degradations: [],
        });
    });
});

describe('requestBodyOf: bodies that are rows', () => {
    it('keeps the fields of a urlencoded body with their switch', () => {
        const rows = [FIELD, { ...FIELD, name: 'b', value: '2', disabled: true }];

        expect(requestBodyOf(bodyNode('form-urlencoded', { rows })).body).toEqual({
            type: 'urlencoded',
            fields: [
                { key: 'a', value: '1', enabled: true },
                { key: 'b', value: '2', enabled: false },
            ],
        });
    });

    it('keeps the text and file fields of a form, and asks for the file to be copied', () => {
        const rows = [
            { ...FIELD, name: 'name', value: 'ana' },
            { ...FIELD, name: 'avatar', value: '', file: 'C:\\fotos\\ana.png' },
            { ...FIELD, name: 'old', value: 'x', disabled: true },
        ];
        const result = requestBodyOf(bodyNode('multipart-form', { rows }));

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
});

describe('requestBodyOf: a file', () => {
    it('keeps the name of the file and asks for it to be copied to the repo root', () => {
        expect(requestBodyOf(bodyNode('file', { file: '/home/a/data.bin' }))).toEqual({
            body: { type: 'binary', file: 'data.bin' },
            degradations: [degradation('fileToCopy', { name: 'data.bin' })],
        });
    });

    it('has no body when no file is named', () => {
        expect(requestBodyOf(bodyNode('file'))).toEqual({
            body: { type: 'none' },
            degradations: [degradation('fileBodyWithoutFile')],
        });
    });
});

describe('requestBodyOf: GraphQL', () => {
    it('keeps the query and its variables', () => {
        const body = bodyNode('graphql', { text: '{ pets { id } }', variables: '{"first":1}' });

        expect(requestBodyOf(body)).toEqual({
            body: { type: 'graphql', query: '{ pets { id } }', variables: '{"first":1}' },
            degradations: [],
        });
    });
});
