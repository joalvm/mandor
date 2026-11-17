import { describe, expect, it } from 'vitest';

import { requestDocumentOf } from '../../../src/bruno/export/request-document.js';
import { requestOf } from '../support/sample-workspace.js';

const SEQ = 1;

describe('requestDocumentOf', () => {
    it('writes a request with its name, place, method and url, and inherits the auth', () => {
        expect(requestDocumentOf(requestOf('listaMascotas'), 3)).toEqual({
            info: { name: 'listaMascotas', type: 'http', seq: 3 },
            http: { method: 'GET', url: '{{baseUrl}}/pets', auth: 'inherit' },
        });
    });

    it('writes the description, the headers and the body it has', () => {
        const document = requestDocumentOf(
            requestOf('alta', {
                method: 'POST',
                description: 'Alta de una mascota',
                headers: [
                    { key: 'X-Key', value: '{{key}}', enabled: true },
                    { key: 'X-Off', value: '1', enabled: false },
                    { key: '', value: 'x', enabled: true },
                ],
                body: { type: 'json', content: '{"name":"{{petName}}"}' },
            }),
            SEQ,
        );

        expect(document).toMatchObject({
            docs: 'Alta de una mascota',
            http: {
                method: 'POST',
                headers: [
                    { name: 'X-Key', value: '{{key}}' },
                    { name: 'X-Off', value: '1', disabled: true },
                ],
                body: { type: 'json', data: '{"name":"{{petName}}"}' },
            },
        });
    });

    it('puts the enabled query in the url and lists all of it as parameters', () => {
        const document = requestDocumentOf(
            requestOf('lista', {
                query: [
                    { key: 'page', value: '1', enabled: true },
                    { key: 'debug', value: '1', enabled: false },
                    { key: '', value: 'x', enabled: true },
                ],
            }),
            SEQ,
        );

        expect(document).toMatchObject({
            http: {
                url: '{{baseUrl}}/pets?page=1',
                params: [
                    { name: 'page', value: '1', type: 'query' },
                    { name: 'debug', value: '1', disabled: true, type: 'query' },
                ],
            },
        });
    });

    it('adds to a url that already holds a query', () => {
        const document = requestDocumentOf(
            requestOf('lista', {
                url: 'https://api.test/pets?a=1',
                query: [{ key: 'page', value: '1', enabled: true }],
            }),
            SEQ,
        );

        expect(document).toMatchObject({ http: { url: 'https://api.test/pets?a=1&page=1' } });
    });

    it('writes a path parameter after a colon, with its value apart', () => {
        const document = requestDocumentOf(
            requestOf('uno', {
                url: '{{baseUrl}}/pets/{id}',
                pathParams: [
                    { key: 'id', value: '7', enabled: true },
                    { key: '', value: 'x', enabled: true },
                ],
            }),
            SEQ,
        );

        expect(document).toMatchObject({
            http: {
                url: '{{baseUrl}}/pets/:id',
                params: [{ name: 'id', value: '7', type: 'path' }],
            },
        });
    });

    it('writes a GraphQL request when the body is a query', () => {
        const document = requestDocumentOf(
            requestOf('pedidos', {
                method: 'POST',
                body: { type: 'graphql', query: '{ a }', variables: '' },
            }),
            SEQ,
        );

        expect(document).toMatchObject({
            info: { type: 'graphql' },
            graphql: { method: 'POST', body: { query: '{ a }', variables: '' } },
        });
        expect(document).not.toHaveProperty('http');
    });

    it('leaves out the rows and the body it has not got', () => {
        const document = requestDocumentOf(requestOf('lista'), SEQ);

        expect(document).not.toHaveProperty('docs');
        expect(document['http']).not.toHaveProperty('headers');
        expect(document['http']).not.toHaveProperty('params');
        expect(document['http']).not.toHaveProperty('body');
    });
});

describe('requestDocumentOf: the auth', () => {
    it('writes the auth the request speaks', () => {
        const document = requestDocumentOf(
            requestOf('lista', { auth: { type: 'bearer', token: '{{t}}' } }),
            SEQ,
        );

        expect(document).toMatchObject({ http: { auth: { type: 'bearer', token: '{{t}}' } } });
    });

    it('writes no auth for a request that stops the inheritance', () => {
        const document = requestDocumentOf(requestOf('lista', { auth: { type: 'none' } }), SEQ);

        expect(document['http']).not.toHaveProperty('auth');
    });

    it('writes the tags the item carries', () => {
        const item = { ...requestOf('alta'), tags: ['smoke'] };

        expect(requestDocumentOf(item, SEQ)).toMatchObject({ info: { tags: ['smoke'] } });
    });

    it('writes the settings and the examples, these only on an HTTP request', () => {
        const example = { name: 'Ok', status: '200', contentType: '', body: '' };
        const body = { settings: { timeoutMs: 5 }, examples: [example] };
        const http = requestDocumentOf({ kind: 'request', name: 'A', tags: [], body }, 1);
        const graphql = requestDocumentOf(
            {
                kind: 'request',
                name: 'B',
                tags: [],
                body: { ...body, body: { type: 'graphql', query: '{a}', variables: '' } },
            },
            2,
        );

        expect(http['settings']).toEqual({ timeout: 5 });
        expect(http['examples']).toHaveLength(1);
        expect(graphql['settings']).toEqual({ timeout: 5 });
        expect(graphql).not.toHaveProperty('examples');
    });
});
