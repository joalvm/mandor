import type { RequestBody } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { bodyDocumentOf, rowsOf } from '../../../src/postman/export/body-document.js';

const BODIES: [string, RequestBody, unknown][] = [
    ['none', { type: 'none' }, undefined],
    [
        'json',
        { type: 'json', content: '{"a":1}' },
        { mode: 'raw', raw: '{"a":1}', options: { raw: { language: 'json' } } },
    ],
    [
        'text',
        { type: 'text', content: 'hola' },
        { mode: 'raw', raw: 'hola', options: { raw: { language: 'text' } } },
    ],
    [
        'xml',
        { type: 'xml', content: '<a/>' },
        { mode: 'raw', raw: '<a/>', options: { raw: { language: 'xml' } } },
    ],
    [
        'urlencoded',
        { type: 'urlencoded', fields: [{ key: 'a', value: '1', enabled: true }] },
        { mode: 'urlencoded', urlencoded: [{ key: 'a', value: '1' }] },
    ],
    [
        'form',
        {
            type: 'form',
            fields: [
                { key: 'name', value: 'rex', enabled: true, kind: 'text' },
                { key: 'photo', value: './rex.png', enabled: false, kind: 'file' },
                { key: '', value: 'half typed', enabled: true, kind: 'text' },
            ],
        },
        {
            mode: 'formdata',
            formdata: [
                { key: 'name', type: 'text', value: 'rex' },
                { key: 'photo', type: 'file', src: './rex.png', disabled: true },
            ],
        },
    ],
    ['binary', { type: 'binary', file: './rex.bin' }, { mode: 'file', file: { src: './rex.bin' } }],
    [
        'graphql',
        { type: 'graphql', query: '{ pets }', variables: '{}' },
        { mode: 'graphql', graphql: { query: '{ pets }', variables: '{}' } },
    ],
];

describe('body-document: a body as the one Postman lists', () => {
    it.each(BODIES)('writes %s the way Postman names its mode', (_name, body, expected) => {
        expect(bodyDocumentOf(body)).toEqual(expected);
    });
});

describe('rows-of: the rows of a table of the request', () => {
    it('keeps a row switched off, switched off, and says what it is for', () => {
        expect(
            rowsOf([
                { key: 'a', value: '1', enabled: false, description: 'the first' },
                { key: 'b', value: '2', enabled: true },
            ]),
        ).toEqual([
            { key: 'a', value: '1', disabled: true, description: 'the first' },
            { key: 'b', value: '2' },
        ]);
    });

    it('leaves out a row nobody named', () => {
        expect(rowsOf([{ key: '', value: 'half typed', enabled: true }])).toEqual([]);
    });
});
