import { describe, expect, it } from 'vitest';

import { bodyOfBru } from '../../../src/bruno/document/read-bru-body.js';
import { bodyNode } from '../support/trees.js';

describe('bodyOfBru', () => {
    it.each([
        ['json', 'json'],
        ['text', 'text'],
        ['xml', 'xml'],
        ['sparql', 'sparql'],
    ])('reads the text of a %s body', (mode, type) => {
        expect(bodyOfBru(mode, { [mode]: 'abc' })).toEqual(bodyNode(type, { text: 'abc' }));
    });

    it('reads an empty text when the block of the mode is not there', () => {
        expect(bodyOfBru('json', undefined)).toEqual(bodyNode('json'));
        expect(bodyOfBru('xml', {})).toEqual(bodyNode('xml'));
        expect(bodyOfBru('text', {})).toEqual(bodyNode('text'));
        expect(bodyOfBru('sparql', {})).toEqual(bodyNode('sparql'));
    });

    it('reads the query and the variables of a GraphQL body', () => {
        expect(bodyOfBru('graphql', { graphql: { query: '{ a }', variables: '{}' } })).toEqual(
            bodyNode('graphql', { text: '{ a }', variables: '{}' }),
        );
        expect(bodyOfBru('graphql', {})).toEqual(bodyNode('graphql'));
    });

    it('reads the fields of a form, a file being told by its type', () => {
        const rows = [
            { name: 'a', value: '1', enabled: true, type: 'text' },
            { name: 'f', value: ['x.png'], enabled: false, type: 'file' },
            { name: 'g', type: 'file' },
            {},
        ];

        expect(bodyOfBru('multipartForm', { multipartForm: rows })).toEqual(
            bodyNode('multipart-form', {
                rows: [
                    { name: 'a', value: '1', disabled: false, file: '' },
                    { name: 'f', value: '', disabled: true, file: 'x.png' },
                    { name: 'g', value: '', disabled: false, file: '' },
                    { name: '', value: '', disabled: false, file: '' },
                ],
            }),
        );
        expect(
            bodyOfBru('formUrlEncoded', { formUrlEncoded: [{ name: 'a', value: 'b' }] }),
        ).toEqual(
            bodyNode('form-urlencoded', {
                rows: [{ name: 'a', value: 'b', disabled: false, file: '' }],
            }),
        );
        expect(bodyOfBru('multipartForm', {})).toEqual(bodyNode('multipart-form'));
        expect(bodyOfBru('formUrlEncoded', {})).toEqual(bodyNode('form-urlencoded'));
    });

    it('reads the file a file body sends: the one marked as selected, or the first', () => {
        const files = [{ filePath: 'a.bin' }, { filePath: 'b.bin', selected: true }];

        expect(bodyOfBru('file', { file: files })).toEqual(bodyNode('file', { file: 'b.bin' }));
        expect(bodyOfBru('file', { file: [{ filePath: 'a.bin' }] })).toEqual(
            bodyNode('file', { file: 'a.bin' }),
        );
        expect(bodyOfBru('file', { file: [] })).toEqual(bodyNode('file'));
        expect(bodyOfBru('file', {})).toEqual(bodyNode('file'));
    });

    it('reads no body for none, for a mode it does not know, or for no mode', () => {
        expect(bodyOfBru('none', {})).toBeUndefined();
        expect(bodyOfBru('unknown', {})).toBeUndefined();
        expect(bodyOfBru(undefined, undefined)).toBeUndefined();
        expect(bodyOfBru(null, null)).toBeUndefined();
    });
});
