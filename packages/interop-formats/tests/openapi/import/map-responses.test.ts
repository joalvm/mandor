import { describe, expect, it } from 'vitest';

import { responsesOf } from '../../../src/openapi/import/map-responses.js';

const NO_DOCUMENT = {};

describe('the responses an operation shows', () => {
    it('keeps a lone example under the status, as text', () => {
        const responses = responsesOf(
            { responses: { '200': { content: { 'application/json': { example: { id: 1 } } } } } },
            NO_DOCUMENT,
        );

        expect(responses).toEqual([
            {
                name: '200',
                status: '200',
                contentType: 'application/json',
                body: '{\n  "id": 1\n}',
            },
        ]);
    });

    it('keeps one per named example, under the name the document gave it', () => {
        const responses = responsesOf(
            {
                responses: {
                    '200': {
                        content: {
                            'application/json': {
                                examples: {
                                    one: { value: [1] },
                                    many: { value: [1, 2] },
                                    empty: {},
                                },
                            },
                        },
                    },
                },
            },
            NO_DOCUMENT,
        );

        expect(responses.map((response) => response.name)).toEqual(['one', 'many']);
    });

    it('goes through every status and every type, and invents nothing without a schema', () => {
        const responses = responsesOf(
            {
                responses: {
                    '200': {
                        content: {
                            'application/json': { example: 'a' },
                            'text/plain': { example: 'b' },
                            'application/xml': {},
                        },
                    },
                    '404': { description: 'no body' },
                    default: { content: { 'text/plain': { example: 'c' } } },
                },
            },
            NO_DOCUMENT,
        );

        expect(responses.map((response) => `${response.status} ${response.contentType}`)).toEqual([
            '200 application/json',
            '200 text/plain',
            'default text/plain',
        ]);
    });

    it('is empty when the operation shows none', () => {
        expect(responsesOf({}, NO_DOCUMENT)).toEqual([]);
    });
});

describe('the schema each example answers to', () => {
    it('gives each example the schema of its media type, as JSON text', () => {
        const responses = responsesOf(
            {
                responses: {
                    '201': {
                        content: {
                            'text/plain': { example: 'hecho' },
                            'application/json': { schema: { type: 'object' }, example: {} },
                        },
                    },
                    '400': { content: { 'application/json': { schema: 'no', example: 1 } } },
                    '404': { content: { 'application/json': { schema: {}, example: 2 } } },
                },
            },
            NO_DOCUMENT,
        );

        expect(responses.map((response) => response.schema)).toEqual([
            undefined,
            '{\n  "type": "object"\n}',
            undefined,
            undefined,
        ]);
    });

    it('makes the example a status with a schema and none shown answers with', () => {
        const schema = { type: 'object', properties: { id: { type: 'integer' } } };
        const [made, ...rest] = responsesOf(
            {
                responses: {
                    '201': { content: { 'text/plain': {}, 'application/json': { schema } } },
                },
            },
            NO_DOCUMENT,
        );

        expect(rest).toEqual([]);
        expect(made).toMatchObject({
            name: '201',
            status: '201',
            contentType: 'application/json',
            schema: JSON.stringify(schema, null, 2),
        });
        expect(JSON.parse(made?.body ?? '')).toEqual({ id: 0 });
    });

    it('makes an empty body where the schema has no sample to give', () => {
        const responses = responsesOf(
            {
                responses: {
                    '200': { content: { 'a/b': { schema: { $ref: 'otro.yaml#/Mascota' } } } },
                },
            },
            NO_DOCUMENT,
        );

        expect(responses.map((response) => response.body)).toEqual(['']);
    });

    it('skips a schema that cannot be told as text instead of failing', () => {
        const loop: Record<string, unknown> = { type: 'object' };

        loop['items'] = loop;

        expect(
            responsesOf({ responses: { '200': { content: { 'a/b': { schema: loop } } } } }, {}),
        ).toEqual([]);
        expect(
            responsesOf(
                { responses: { '200': { content: { 'a/b': { schema: loop, example: 'x' } } } } },
                NO_DOCUMENT,
            ),
        ).toEqual([{ name: '200', status: '200', contentType: 'a/b', body: 'x' }]);
    });
});
