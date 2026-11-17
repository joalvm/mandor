import { describe, expect, it } from 'vitest';

import { requestBodyOf } from '../../../src/openapi/import/map-request-body.js';

function bodyOf(content: Record<string, unknown>, required?: boolean) {
    return requestBodyOf({ requestBody: { required, content } }, {});
}

describe('the body of a request', () => {
    it('is absent when the operation sends none, or says nothing about it', () => {
        expect(requestBodyOf({}, {})).toBeUndefined();
        expect(requestBodyOf({ requestBody: { content: {} } }, {})).toBeUndefined();
        expect(requestBodyOf({ requestBody: {} }, {})).toBeUndefined();
    });

    it.each([
        [
            'JSON over everything',
            ['text/plain', 'application/json', 'application/xml'],
            'application/json',
        ],
        [
            'a +json type next',
            ['text/plain', 'application/problem+json', 'application/xml'],
            'application/problem+json',
        ],
        ['XML next', ['text/plain', 'application/xml', 'multipart/form-data'], 'application/xml'],
        ['text next', ['multipart/form-data', 'text/csv'], 'text/csv'],
        [
            'urlencoded next',
            ['multipart/form-data', 'application/x-www-form-urlencoded'],
            'application/x-www-form-urlencoded',
        ],
        [
            'form-data next',
            ['application/octet-stream', 'multipart/form-data'],
            'multipart/form-data',
        ],
        ['the first one there is, otherwise', ['image/png', 'application/pdf'], 'image/png'],
    ])('prefers %s', (_name, types, expected) => {
        const content = Object.fromEntries(types.map((type) => [type, {}]));

        expect(bodyOf(content)?.contentType).toBe(expected);
    });

    it('starts with the example the document gives, as text', () => {
        const json = bodyOf({ 'application/json': { example: { id: 1 } } });
        const named = bodyOf({
            'application/json': { examples: { first: { value: { id: 2 } }, second: { value: 3 } } },
        });

        expect(json?.value).toBe('{\n  "id": 1\n}');
        expect(named?.value).toBe('{\n  "id": 2\n}');
    });

    it('makes a sample out of the schema when the document gives no example', () => {
        const body = bodyOf({
            'application/json': {
                schema: {
                    type: 'object',
                    properties: { id: { type: 'integer' }, name: { type: 'string' } },
                },
            },
        });

        expect(JSON.parse(body?.value ?? '')).toEqual({ id: 0, name: 'string' });
    });

    it('starts empty when there is neither an example nor a schema', () => {
        expect(bodyOf({ 'application/json': {} })?.value).toBe('');
    });

    it('keeps the schema as text, and whether the body is required', () => {
        const body = bodyOf({ 'application/json': { schema: { type: 'string' } } }, true);

        expect(body?.schema).toBe('{"type":"string"}');
        expect(body?.required).toBe(true);
        expect(bodyOf({ 'application/json': {} })?.schema).toBeUndefined();
        expect(bodyOf({ 'application/json': {} })?.required).toBe(false);
    });

    it('follows a schema that points back at itself, through the document', () => {
        const node = {
            type: 'object',
            properties: { child: { $ref: '#/components/schemas/Node' } },
        };
        const body = requestBodyOf(
            { requestBody: { content: { 'application/json': { schema: node } } } },
            { components: { schemas: { Node: node } } },
        );

        expect(body?.value).toBeTypeOf('string');
        expect(body?.value).not.toBe('');
    });

    it('starts empty when the schema points outside the document: it is not followed', () => {
        const schema = { $ref: './other.json' };
        const body = requestBodyOf(
            { requestBody: { content: { 'application/json': { schema } } } },
            {},
        );

        expect(body?.value).toBe('');
        expect(body?.schema).toBe('{"$ref":"./other.json"}');
    });
});
