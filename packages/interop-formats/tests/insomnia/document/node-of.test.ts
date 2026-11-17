import { describe, expect, it } from 'vitest';

import { environmentOf, folderOf, requestOf } from '../../../src/insomnia/document/node-of.js';

describe('requestOf', () => {
    it('fills what the request left unsaid with what an empty request holds', () => {
        expect(requestOf({}, '')).toEqual({
            kind: 'request',
            name: '',
            method: 'GET',
            url: '',
            description: '',
            headers: [],
            parameters: [],
            pathParameters: [],
            body: undefined,
            authentication: undefined,
            scripts: { preRequest: '', afterResponse: '' },
            settings: {
                followRedirects: 'global',
                encodeUrl: true,
                rebuildPath: true,
                renderRequestBody: true,
                sendCookies: true,
                storeCookies: true,
            },
        });
    });

    it('keeps the rows with their flags and the body with its fields', () => {
        const request = requestOf(
            {
                name: 'Alta',
                method: 'POST',
                url: 'https://api.test',
                headers: [{ name: 'A', value: '1', disabled: true }, { name: 'B' }],
                parameters: [{ name: 'q', value: 'x', type: 'file', fileName: 'a.txt' }],
                pathParameters: [{ name: 'id', value: '7' }],
                body: {
                    mimeType: 'multipart/form-data',
                    text: 't',
                    fileName: 'f',
                    params: [{ name: 'p', value: 'v' }],
                },
                authentication: { type: 'bearer' },
            },
            'what it does',
        );

        expect(request).toMatchObject({
            name: 'Alta',
            method: 'POST',
            description: 'what it does',
            headers: [
                { name: 'A', value: '1', disabled: true, type: '', fileName: '' },
                { name: 'B', value: '', disabled: false },
            ],
            parameters: [{ name: 'q', type: 'file', fileName: 'a.txt' }],
            pathParameters: [{ name: 'id', value: '7' }],
            body: {
                mimeType: 'multipart/form-data',
                text: 't',
                fileName: 'f',
                params: [{ name: 'p', value: 'v' }],
            },
            authentication: { type: 'bearer' },
        });
    });

    it('names a row that came without a name with an empty one', () => {
        expect(requestOf({ headers: [{ value: 'x' }] }, '').headers).toMatchObject([
            { name: '', value: 'x' },
        ]);
    });

    it('fills a body that said nothing of its fields', () => {
        expect(requestOf({ body: {} }, '').body).toEqual({
            mimeType: '',
            text: '',
            fileName: '',
            params: [],
        });
    });

    it('has no body for a request that wrote null', () => {
        expect(requestOf({ body: null, authentication: null }, '')).toMatchObject({
            body: undefined,
            authentication: undefined,
        });
    });
});

describe('folderOf', () => {
    it('holds its name, headers, auth and the children already read', () => {
        const child = requestOf({ name: 'R' }, '');
        const folder = folderOf(
            { name: 'F', headers: [{ name: 'H', value: 'v' }], authentication: { type: 'none' } },
            'notes',
            [child],
        );

        expect(folder).toMatchObject({
            kind: 'folder',
            name: 'F',
            description: 'notes',
            headers: [{ name: 'H', value: 'v' }],
            authentication: { type: 'none' },
            children: [child],
        });
    });

    it('fills what the folder left unsaid', () => {
        expect(folderOf({}, '', [])).toEqual({
            kind: 'folder',
            name: '',
            description: '',
            headers: [],
            authentication: undefined,
            environment: {},
            scripts: { preRequest: '', afterResponse: '' },
            children: [],
        });
    });
});

describe('environmentOf', () => {
    it('keeps the name and the free JSON of the variables', () => {
        expect(environmentOf('Prod', { a: 1 })).toEqual({ name: 'Prod', data: { a: 1 } });
    });

    it('has an empty name and no variables when Insomnia wrote null', () => {
        expect(environmentOf(null, undefined)).toEqual({ name: '', data: {} });
    });
});
