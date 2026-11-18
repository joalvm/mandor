import { describe, expect, it } from 'vitest';

import { responsesOf } from '../../../src/openapi/export/document-responses.js';

const CREATED = {
    name: '201',
    status: '201',
    contentType: 'application/json',
    body: '{"id":1}',
};

describe('the responses of an operation, with the schema of each example', () => {
    it('says nothing when there is no example', () => {
        expect(responsesOf([])).toBeUndefined();
    });

    it('puts the schema of the example in its media type', () => {
        expect(responsesOf([{ ...CREATED, schema: '{"type":"object"}' }])).toEqual({
            '201': {
                description: '',
                content: {
                    'application/json': { schema: { type: 'object' }, example: { id: 1 } },
                },
            },
        });
    });

    it('leaves the schema open for an example that has none, or whose text cannot be read', () => {
        const other = { ...CREATED, name: '404', status: '404', schema: '{"type":' };

        expect(responsesOf([CREATED, other])).toEqual({
            '201': {
                description: '',
                content: { 'application/json': { schema: {}, example: { id: 1 } } },
            },
            '404': {
                description: '',
                content: { 'application/json': { schema: {}, example: { id: 1 } } },
            },
        });
    });

    it('writes once the schema the examples of a type share', () => {
        const schema = '{"type":"object"}';
        const media = responsesOf([
            { ...CREATED, name: 'uno', schema },
            { ...CREATED, name: 'otro', schema: '{ "type": "object" }' },
        ]);

        expect(media).toMatchObject({
            '201': { content: { 'application/json': { schema: { type: 'object' } } } },
        });
    });

    it('writes the different shapes of one type as any of them', () => {
        const media = responsesOf([
            { ...CREATED, name: 'completo', schema: '{"type":"object"}' },
            { ...CREATED, name: 'paginado', schema: '{"type":"array"}' },
            { ...CREATED, name: 'libre' },
        ]);

        expect(media).toMatchObject({
            '201': {
                content: {
                    'application/json': {
                        schema: { oneOf: [{ type: 'object' }, { type: 'array' }] },
                    },
                },
            },
        });
    });
});
