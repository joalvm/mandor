import { describe, expect, it } from 'vitest';

import { interopHttpOperationSchema } from '../../src/ir/interop-http-schema.js';

const http = {
    method: 'GET',
    path: '/pets/{petId}',
    tags: ['pets'],
    parameters: [{ name: 'petId', in: 'path', required: true, value: '7' }],
    requestBody: { contentType: 'application/json', value: '{}', required: false },
    responses: [{ name: '200', status: '200', contentType: 'application/json', body: '{}' }],
    security: null,
};

describe('the http part of an operation', () => {
    it('reads request and response, with its parameters and body', () => {
        const read = interopHttpOperationSchema.parse(http);

        expect(read.parameters[0]?.in).toBe('path');
        expect(read.security).toBeNull();
    });

    it('refuses a parameter that lives in a place a request has no such thing', () => {
        const parameters = [{ name: 'x', in: 'body', required: false, value: '' }];

        expect(interopHttpOperationSchema.safeParse({ ...http, parameters }).success).toBe(false);
    });

    it('refuses a key it does not know, so a typo does not ride in silently', () => {
        expect(interopHttpOperationSchema.safeParse({ ...http, verb: 'GET' }).success).toBe(false);
    });

    it('tells apart an operation that inherits the default security from one that has none', () => {
        expect(interopHttpOperationSchema.parse({ ...http, security: [] }).security).toEqual([]);
    });

    it('reads an operation that gives its own url, its group, scripts, rows and a switched-off parameter', () => {
        const read = interopHttpOperationSchema.parse({
            ...http,
            path: '',
            url: '{{base}}/pets',
            group: ['Pets', 'Admin'],
            scripts: [{ event: 'onResponse', source: 'a()', enabled: true }],
            parameters: [{ name: 'q', in: 'query', required: false, value: '', enabled: false }],
            requestBody: {
                contentType: 'multipart/form-data',
                value: '',
                required: false,
                variables: '{}',
                fields: [{ key: 'f', value: 'a.png', enabled: true, kind: 'file' }],
            },
            responses: [{ name: 'response', status: '', contentType: '', body: '' }],
        });

        expect(read.group).toEqual(['Pets', 'Admin']);
        expect(read.parameters[0]?.enabled).toBe(false);
        expect(read.requestBody?.fields).toHaveLength(1);
    });

    it('refuses a blank url and a group with a blank name', () => {
        expect(interopHttpOperationSchema.safeParse({ ...http, url: ' ' }).success).toBe(false);
        expect(interopHttpOperationSchema.safeParse({ ...http, group: [' '] }).success).toBe(false);
    });

    it('reads the schema of the answer of a response as text', () => {
        const response = {
            name: 'lista',
            status: '200',
            contentType: 'application/json',
            body: '[]',
        };
        const parsed = interopHttpOperationSchema.safeParse({
            ...http,
            responses: [{ ...response, schema: '{"type":"array"}' }],
        });

        expect(parsed.success).toBe(true);
        expect(
            interopHttpOperationSchema.safeParse({
                ...http,
                responses: [{ ...response, schema: 1 }],
            }).success,
        ).toBe(false);
    });
});
