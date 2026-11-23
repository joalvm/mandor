import { describe, expect, it } from 'vitest';

import type { RequestItem } from '../../src/request/request-item.js';
import { createRequestItem } from '../../src/index.js';
import { requestItemBody } from '../../src/request/request-item-body.js';

describe('requestItemBody', () => {
    it('writes the keys of the kind flat, with no wrapper of its own', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const written = { ...request, url: '{{baseUrl}}', description: '# Para qué' };

        expect(requestItemBody(written)).toEqual({
            method: 'GET',
            url: '{{baseUrl}}',
            query: undefined,
            headers: undefined,
            pathParams: undefined,
            body: undefined,
            bodySchema: undefined,
            examples: undefined,
            settings: {},
            description: '# Para qué',
            scripts: undefined,
        });
    });

    it('names every key it owns, so an emptied field comes out of the file', () => {
        const body = requestItemBody(createRequestItem({ name: 'crear pedido' }));

        expect(Object.keys(body)).toEqual([
            'method',
            'url',
            'query',
            'headers',
            'pathParams',
            'body',
            'bodySchema',
            'examples',
            'settings',
            'description',
            'scripts',
        ]);
        expect(body['url']).toBeUndefined();
        expect(body['query']).toBeUndefined();
        expect(body['body']).toBeUndefined();
        expect(body['description']).toBeUndefined();
    });

    it('writes the lines and the body the request carries, whole', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const written = {
            ...request,
            query: [{ key: 'dryRun', value: 'true', enabled: false }],
            headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
            body: { type: 'json', content: '{}' } as const,
        };

        expect(requestItemBody(written)['query']).toEqual(written.query);
        expect(requestItemBody(written)['headers']).toEqual(written.headers);
        expect(requestItemBody(written)['body']).toEqual({ type: 'json', content: '{}' });
    });

    it('a line half typed travels in the request, but not in the file', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const written: RequestItem = {
            ...request,
            headers: [
                { enabled: true, key: 'X-Tag', value: 'quiet' },
                { enabled: true, key: '', value: '' },
            ],
            body: {
                fields: [
                    { enabled: true, key: 'user', value: 'mandor' },
                    { enabled: true, key: '', value: '' },
                ],
                type: 'urlencoded',
            },
        };
        const body = requestItemBody(written);

        expect(body['headers']).toEqual([{ enabled: true, key: 'X-Tag', value: 'quiet' }]);
        expect(body['body']).toEqual({
            fields: [{ enabled: true, key: 'user', value: 'mandor' }],
            type: 'urlencoded',
        });

        const form = {
            ...written,
            body: {
                fields: [
                    { enabled: true, key: 'cv', kind: 'file', value: 'a.png' },
                    { enabled: true, key: '', kind: 'text', value: '' },
                ],
                type: 'form',
            },
        } satisfies RequestItem;

        expect(requestItemBody(form)['body']).toEqual({
            fields: [{ enabled: true, key: 'cv', kind: 'file', value: 'a.png' }],
            type: 'form',
        });
    });

    it('writes a graphql body whole, variables as the person wrote them', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const written: RequestItem = {
            ...request,
            body: { type: 'graphql', query: 'query A { a }', variables: '{ "id": 1 }' },
        };

        expect(requestItemBody(written)['body']).toEqual({
            type: 'graphql',
            query: 'query A { a }',
            variables: '{ "id": 1 }',
        });
    });

    it('writes what the document gave the request: path rows, body schema and examples', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const example = { name: '200', status: '200', contentType: 'application/json', body: '{}' };
        const written: RequestItem = {
            ...request,
            pathParams: [
                {
                    key: 'petId',
                    value: '7',
                    enabled: true,
                    required: true,
                    schema: '{"type":"integer"}',
                },
                { key: '', value: '', enabled: true },
            ],
            bodySchema: '{"type":"object"}',
            examples: [example],
        };
        const body = requestItemBody(written);

        expect(body['pathParams']).toEqual([
            {
                key: 'petId',
                value: '7',
                enabled: true,
                required: true,
                schema: '{"type":"integer"}',
            },
        ]);
        expect(body['bodySchema']).toBe('{"type":"object"}');
        expect(body['examples']).toEqual([example]);
    });

    it('writes the schema of the answer with its example', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const example = {
            name: 'creado',
            status: '201',
            contentType: 'application/json',
            body: '{}',
            schema: '{"type":"object"}',
        };

        expect(requestItemBody({ ...request, examples: [example] })['examples']).toEqual([example]);
    });

    it('writes only the settings the request changes, so the diff says what it overrides', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const written = { ...request, settings: { ...request.settings, validateTls: false } };

        expect(requestItemBody(written)['settings']).toEqual({ validateTls: false });
    });
});
