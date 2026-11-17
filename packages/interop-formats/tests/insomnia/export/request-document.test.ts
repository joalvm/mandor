import { describe, expect, it } from 'vitest';

import { insomniaIdOf } from '../../../src/insomnia/export/insomnia-id.js';
import { requestDocumentOf } from '../../../src/insomnia/export/request-document.js';
import { requestOf } from '../support/sample-workspace.js';

describe('requestDocumentOf', () => {
    it('writes a request with its url, name, method and an id drawn from where it sits', () => {
        const document = requestDocumentOf(requestOf('listaMascotas'), ['Tienda'], undefined);

        expect(document).toEqual({
            url: '{{ _.baseUrl }}/pets',
            name: 'listaMascotas',
            meta: { id: insomniaIdOf('req', 'Tienda', 'listaMascotas') },
            method: 'GET',
        });
    });

    it('writes the description, the rows and the body it has', () => {
        const document = requestDocumentOf(
            requestOf('alta', {
                method: 'POST',
                description: 'Alta de una mascota',
                query: [
                    { key: 'page', value: '1', enabled: true },
                    { key: 'debug', value: '1', enabled: false },
                    { key: '', value: 'x', enabled: true },
                ],
                headers: [{ key: 'X-Key', value: '{{key}}', enabled: true }],
                body: { type: 'json', content: '{"name":"{{petName}}"}' },
            }),
            ['Tienda', 'Mascotas'],
            undefined,
        );

        expect(document).toMatchObject({
            meta: { description: 'Alta de una mascota' },
            method: 'POST',
            parameters: [
                { name: 'page', value: '1' },
                { name: 'debug', value: '1', disabled: true },
            ],
            headers: [{ name: 'X-Key', value: '{{ _.key }}' }],
            body: { mimeType: 'application/json', text: '{"name":"{{ _.petName }}"}' },
        });
        expect(document['meta']).toMatchObject({
            id: insomniaIdOf('req', 'Tienda', 'Mascotas', 'alta'),
        });
        expect(document).not.toHaveProperty('pathParameters');
        expect(document).not.toHaveProperty('authentication');
    });

    it('writes a path parameter as :name in the url and keeps its value beside it', () => {
        const document = requestDocumentOf(
            requestOf('uno', {
                url: '{{baseUrl}}/pets/{id}/photos/{photo-id}?x={y}',
                pathParams: [
                    { key: 'id', value: '7', enabled: true },
                    { key: 'photo-id', value: '2', enabled: true },
                    { key: '', value: 'x', enabled: true },
                ],
            }),
            ['Tienda'],
            undefined,
        );

        expect(document['url']).toBe('{{ _.baseUrl }}/pets/:id/photos/:photo-id?x={y}');
        expect(document['pathParameters']).toEqual([
            { name: 'id', value: '7' },
            { name: 'photo-id', value: '2' },
        ]);
    });

    it('writes its own auth, and the one it is given when it has none of its own', () => {
        const own = requestDocumentOf(
            requestOf('uno', { auth: { type: 'bearer', token: '{{t}}' } }),
            ['Tienda'],
            { type: 'none' },
        );
        const inherited = requestDocumentOf(requestOf('uno'), ['Tienda'], {
            type: 'basic',
            username: 'ana',
            password: '{{pw}}',
        });
        const deferred = requestDocumentOf(
            requestOf('uno', { auth: { inherit: true } }),
            ['Tienda'],
            {
                type: 'none',
            },
        );

        expect(own['authentication']).toEqual({ type: 'bearer', token: '{{ _.t }}' });
        expect(inherited['authentication']).toEqual({
            type: 'basic',
            username: 'ana',
            password: '{{ _.pw }}',
        });
        expect(deferred['authentication']).toEqual({ type: 'none' });
    });

    it('writes an auth of none that the request chose itself, which stops the inheritance', () => {
        const document = requestDocumentOf(
            requestOf('uno', { auth: { type: 'none' } }),
            ['Tienda'],
            { type: 'bearer', token: '{{t}}' },
        );

        expect(document['authentication']).toEqual({ type: 'none' });
    });

    it('writes no auth for a request that inherits where nothing is above it', () => {
        const document = requestDocumentOf(
            requestOf('uno', { auth: { inherit: true } }),
            ['T'],
            undefined,
        );

        expect(document).not.toHaveProperty('authentication');
    });

    it('writes its switches and its own scripts, whose text leaves untouched', () => {
        const document = requestDocumentOf(
            {
                kind: 'request',
                name: 'Pide',
                tags: [],
                body: {
                    method: 'GET',
                    url: 'https://x',
                    settings: { followRedirects: false },
                    importedScripts: [
                        { event: 'onResponse', dialect: 'insomnia', source: 'a("{{b}}");' },
                    ],
                },
            },
            ['Tienda'],
            undefined,
        );

        expect(document['settings']).toMatchObject({ followRedirects: 'off' });
        expect(document['scripts']).toEqual({ afterResponse: 'a("{{b}}");' });
    });
});
