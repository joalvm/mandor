import { describe, expect, it } from 'vitest';

import { requestDocumentOf } from '../../../src/postman/export/request-document.js';
import { requestOf } from '../support/sample-workspace.js';

function requestOfDocument(document: Record<string, unknown>): Record<string, unknown> {
    return document['request'] as Record<string, unknown>;
}

describe('request-document: a request as the item Postman lists', () => {
    it('writes the name, the method and the url of the request', () => {
        const document = requestDocumentOf(requestOf('listaMascotas'));

        expect(document['name']).toBe('listaMascotas');
        expect(requestOfDocument(document)).toMatchObject({
            method: 'GET',
            header: [],
            url: { raw: '{{baseUrl}}/pets' },
        });
        expect(document['response']).toEqual([]);
        expect('event' in document).toBe(false);
    });

    it('writes the query into the url and as rows, the one switched off only as a row', () => {
        const item = requestOf('buscar', {
            query: [
                { key: 'q', value: 'rex', enabled: true },
                { key: 'debug', value: '1', enabled: false },
            ],
        });
        const { url } = requestOfDocument(requestDocumentOf(item)) as {
            url: Record<string, unknown>;
        };

        expect(url).toEqual({
            raw: '{{baseUrl}}/pets?q=rex',
            query: [
                { key: 'q', value: 'rex' },
                { key: 'debug', value: '1', disabled: true },
            ],
        });
    });

    it('writes a path variable as Postman reads it', () => {
        const item = requestOf('una', {
            url: '{{baseUrl}}/pets/{petId}/photos/{{size}}',
            pathParams: [{ key: 'petId', value: '7', enabled: true }],
        });
        const { url } = requestOfDocument(requestDocumentOf(item)) as {
            url: Record<string, unknown>;
        };

        expect(url).toEqual({
            raw: '{{baseUrl}}/pets/:petId/photos/{{size}}',
            variable: [{ key: 'petId', value: '7' }],
        });
    });

    it('writes the body, the headers and the notes of the request', () => {
        const item = requestOf('crear', {
            method: 'POST',
            headers: [{ key: 'X-Trace', value: 'abc', enabled: true }],
            body: { type: 'json', content: '{}' },
            description: 'Creates a pet',
        });

        expect(requestOfDocument(requestDocumentOf(item))).toMatchObject({
            method: 'POST',
            header: [{ key: 'X-Trace', value: 'abc' }],
            body: { mode: 'raw', raw: '{}' },
            description: 'Creates a pet',
        });
    });

    it('writes the auth of the request itself, and none where it inherits: Postman walks up', () => {
        const own = requestOf('uno', { auth: { type: 'bearer', token: '{{own}}' } });
        const inherit = requestOf('dos', { auth: { inherit: true } });

        expect(requestOfDocument(requestDocumentOf(own))).toHaveProperty('auth.bearer', [
            { key: 'token', value: '{{own}}', type: 'string' },
        ]);
        expect(requestOfDocument(requestDocumentOf(inherit))).not.toHaveProperty('auth');
    });

    it('writes the examples with their status and their content type', () => {
        const item = requestOf('ejemplo', {
            examples: [
                { name: 'ok', status: '200', contentType: 'application/json', body: '[]' },
                { name: 'raro', status: 'teapot', contentType: '', body: '' },
            ],
        });

        expect(requestDocumentOf(item)['response']).toMatchObject([
            {
                name: 'ok',
                code: 200,
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: '[]',
            },
            { name: 'raro', header: [], body: '' },
        ]);
    });

    it('writes the scripts of the request under the event Postman calls them by', () => {
        const item = requestOf('con script', {
            scripts: {
                onBeforeRequest: { source: 'a();\nb();' },
                onResponse: { source: 'pm.test()' },
            },
        });

        expect(requestDocumentOf(item)['event']).toEqual([
            { listen: 'prerequest', script: { type: 'text/javascript', exec: ['a();', 'b();'] } },
            { listen: 'test', script: { type: 'text/javascript', exec: ['pm.test()'] } },
        ]);
    });

    it('writes the headers and the cookies an example answers with', () => {
        const item = requestOf('con todo', {
            examples: [
                {
                    name: 'ok',
                    status: '200',
                    contentType: 'text/plain',
                    body: '',
                    headers: [['X-Id', '1']],
                    cookies: [{ name: 'a', value: '1', httpOnly: true, secure: false }],
                },
                {
                    name: 'lo dice',
                    status: '200',
                    contentType: 'text/plain',
                    body: '',
                    headers: [['content-type', 'text/plain']],
                    cookies: [
                        {
                            name: 'b',
                            value: '2',
                            domain: 'x.test',
                            path: '/',
                            expires: 'mañana',
                            httpOnly: false,
                            secure: true,
                        },
                    ],
                },
            ],
        });

        expect(requestDocumentOf(item)['response']).toMatchObject([
            {
                header: [
                    { key: 'Content-Type', value: 'text/plain' },
                    { key: 'X-Id', value: '1' },
                ],
                cookie: [
                    { name: 'a', value: '1', domain: '', path: '', httpOnly: true, secure: false },
                ],
            },
            {
                header: [{ key: 'content-type', value: 'text/plain' }],
                cookie: [{ domain: 'x.test', path: '/', expires: 'mañana', secure: true }],
            },
        ]);
    });

    it('writes each example with the request it sends, what it changes on top', () => {
        const item = requestOf('con ejemplo', {
            description: 'nota',
            examples: [
                {
                    name: 'otro',
                    status: '200',
                    contentType: '',
                    body: '',
                    request: { query: [{ key: 'a', value: '2', enabled: true }] },
                },
            ],
        });
        const [example] = requestDocumentOf(item)['response'] as Record<string, unknown>[];

        expect(example?.['originalRequest']).toMatchObject({
            method: 'GET',
            description: 'nota',
            url: { query: [{ key: 'a', value: '2' }] },
        });
    });

    it('writes the settings Postman has too', () => {
        const document = requestDocumentOf(
            requestOf('sinSeguir', { settings: { followRedirects: false, timeoutMs: 5 } }),
        );

        expect(document['protocolProfileBehavior']).toEqual({ followRedirects: false });
    });
});
