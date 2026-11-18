import { describe, expect, it } from 'vitest';

import { graphqlBodyOf, httpBodyOf } from '../../../src/bruno/document/read-oc-body.js';
import { bodyNode } from '../support/trees.js';

describe('httpBodyOf', () => {
    it.each(['json', 'text', 'xml', 'sparql'])('reads the text of a %s body', (type) => {
        expect(httpBodyOf({ type, data: 'abc' })).toEqual(bodyNode(type, { text: 'abc' }));
    });

    it('reads an empty text for a raw body that holds no text', () => {
        expect(httpBodyOf({ type: 'json', data: [] })).toEqual(bodyNode('json'));
    });

    it('reads the fields of a form, a file being told by the path it names', () => {
        const data = [
            { name: 'a', value: '1', type: 'text' },
            { name: 'photo', type: 'file', value: ['./x.png', './y.png'], disabled: true },
            { name: 'empty', type: 'file' },
            {},
        ];

        expect(httpBodyOf({ type: 'multipart-form', data })).toEqual(
            bodyNode('multipart-form', {
                rows: [
                    { name: 'a', value: '1', disabled: false, file: '' },
                    { name: 'photo', value: '', disabled: true, file: './x.png' },
                    { name: 'empty', value: '', disabled: false, file: '' },
                    { name: '', value: '', disabled: false, file: '' },
                ],
            }),
        );
        expect(
            httpBodyOf({ type: 'form-urlencoded', data: [{ name: 'a', value: ['b'] }] }),
        ).toEqual(
            bodyNode('form-urlencoded', {
                rows: [{ name: 'a', value: 'b', disabled: false, file: '' }],
            }),
        );
    });

    it('reads no field for a form whose data is no list of fields', () => {
        expect(httpBodyOf({ type: 'multipart-form', data: 'x' })).toEqual(
            bodyNode('multipart-form'),
        );
    });

    it('reads the file a file body sends: the one marked as selected, or the first', () => {
        const data = [{ filePath: 'a.bin' }, { filePath: 'b.bin', selected: true }];

        expect(httpBodyOf({ type: 'file', data })).toEqual(bodyNode('file', { file: 'b.bin' }));
        expect(httpBodyOf({ type: 'file', data: [{ filePath: 'a.bin' }] })).toEqual(
            bodyNode('file', { file: 'a.bin' }),
        );
        expect(httpBodyOf({ type: 'file', data: [] })).toEqual(bodyNode('file'));
        expect(httpBodyOf({ type: 'file', data: 'x' })).toEqual(bodyNode('file'));
    });

    it('reads the selected body of a list of bodies, or the first', () => {
        expect(
            httpBodyOf([
                { body: { type: 'text', data: 'a' } },
                { selected: true, body: { type: 'json', data: 'b' } },
            ]),
        ).toEqual(bodyNode('json', { text: 'b' }));
        expect(httpBodyOf([{ body: { type: 'text', data: 'a' } }])).toEqual(
            bodyNode('text', { text: 'a' }),
        );
    });

    it('reads no body when there is none, the list is empty or the type is not known', () => {
        expect(httpBodyOf(undefined)).toBeUndefined();
        expect(httpBodyOf(null)).toBeUndefined();
        expect(httpBodyOf([])).toBeUndefined();
        expect(httpBodyOf([{ selected: true, body: null }])).toBeUndefined();
        expect(httpBodyOf({ type: 'none' })).toBeUndefined();
        expect(httpBodyOf({})).toBeUndefined();
    });
});

describe('graphqlBodyOf', () => {
    it('reads the query and the variables', () => {
        expect(graphqlBodyOf({ query: '{ a }', variables: '{}' })).toEqual(
            bodyNode('graphql', { text: '{ a }', variables: '{}' }),
        );
        expect(graphqlBodyOf({})).toEqual(bodyNode('graphql'));
    });

    it('reads the selected body of a list, or the first', () => {
        expect(
            graphqlBodyOf([{ body: { query: 'a' } }, { selected: true, body: { query: 'b' } }]),
        ).toEqual(bodyNode('graphql', { text: 'b' }));
        expect(graphqlBodyOf([{ body: { query: 'a' } }])).toEqual(
            bodyNode('graphql', { text: 'a' }),
        );
    });

    it('reads no body when there is none', () => {
        expect(graphqlBodyOf(undefined)).toBeUndefined();
        expect(graphqlBodyOf(null)).toBeUndefined();
        expect(graphqlBodyOf([])).toBeUndefined();
    });
});
