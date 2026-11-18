import { describe, expect, it } from 'vitest';

import { type CollectionItem, parseRequestItem } from '@mandor/schema';

import { requestBodyOf } from '../../src/workspace/body-of-request.js';

function requestItem(body: Record<string, unknown> = {}): CollectionItem {
    return {
        kind: 'request',
        name: 'listaMascotas',
        tags: [],
        body: {
            method: 'GET',
            url: '{{baseUrl}}/pets',
            query: [],
            headers: [],
            pathParams: [],
            body: { type: 'none' },
            examples: [],
            settings: {
                timeoutMs: 30_000,
                followRedirects: true,
                maxRedirects: 5,
                validateTls: true,
            },
            ...body,
        },
    };
}

function bodyOf(
    requestBody: Record<string, unknown>,
    extra: Record<string, unknown> = {},
): ReturnType<typeof requestBodyOf> {
    return requestBodyOf(parseRequestItem(requestItem({ body: requestBody, ...extra })));
}

describe('the body of a request as the content the document speaks', () => {
    it.each([
        ['json', { type: 'json', content: '{"name": 1}' }, 'application/json', '{\n  "name": 1\n}'],
        ['text', { type: 'text', content: 'hola' }, 'text/plain', 'hola'],
        ['xml', { type: 'xml', content: '<a/>' }, 'application/xml', '<a/>'],
        [
            'urlencoded',
            { type: 'urlencoded', fields: [{ key: 'a', value: '1', enabled: true }] },
            'application/x-www-form-urlencoded',
            '{\n  "a": "1"\n}',
        ],
        [
            'form',
            {
                type: 'form',
                fields: [
                    { key: 'a', value: '1', enabled: true, kind: 'text' },
                    { key: 'doc', value: 'docs/a.pdf', enabled: true, kind: 'file' },
                ],
            },
            'multipart/form-data',
            '{\n  "a": "1",\n  "doc": "docs/a.pdf"\n}',
        ],
        ['binary', { type: 'binary', file: 'a.bin' }, 'application/octet-stream', ''],
        [
            'graphql',
            {
                type: 'graphql',
                query: 'query { pets }',
                variables: '{"x": 1}',
                operationName: 'pets',
            },
            'application/json',
            '{\n  "query": "query { pets }",\n  "variables": {\n    "x": 1\n  },\n  "operationName": "pets"\n}',
        ],
    ] as const)(
        'writes a %s body as the content its type speaks',
        (_type, body, contentType, value) => {
            expect(bodyOf(body)).toMatchObject({ contentType, value, required: false });
        },
    );

    it('normalizes a json body that parses and keeps the rest as written', () => {
        expect(bodyOf({ type: 'json', content: '{"a":1}' })?.value).toBe('{\n  "a": 1\n}');
        expect(bodyOf({ type: 'json', content: 'sin json' })?.value).toBe('sin json');
        expect(bodyOf({ type: 'json', content: '"texto"' })?.value).toBe('"texto"');
    });

    it('carries the schema of the body when the request keeps one that is JSON', () => {
        expect(
            bodyOf({ type: 'json', content: '{}' }, { bodySchema: '{"type":"object"}' })?.schema,
        ).toBe('{"type":"object"}');
        expect(
            bodyOf({ type: 'json', content: '{}' }, { bodySchema: '{no}' })?.schema,
        ).toBeUndefined();
        expect(bodyOf({ type: 'json', content: '{}' })?.schema).toBeUndefined();
    });

    it('says nothing of a body the request does not have', () => {
        expect(bodyOf({ type: 'none' })).toBeUndefined();
    });
});
