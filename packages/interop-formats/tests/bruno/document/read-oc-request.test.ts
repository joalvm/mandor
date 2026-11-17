import { describe, expect, it } from 'vitest';

import { noteOf, requestOf } from '../../../src/bruno/document/read-oc-request.js';
import { bodyNode, requestNode } from '../support/trees.js';

describe('noteOf', () => {
    it('prefers the docs of an item to its description', () => {
        expect(noteOf({ docs: 'docs', info: { description: 'desc' } })).toBe('docs');
        expect(noteOf({ info: { description: { content: 'desc' } } })).toBe('desc');
        expect(noteOf({})).toBe('');
    });
});

describe('requestOf', () => {
    it('reads an HTTP request with its rows, body and auth', () => {
        const request = requestOf(
            {
                info: { name: 'ignored', seq: 2 },
                http: {
                    method: 'post',
                    url: 'https://api.test/pets/:id?q=1',
                    headers: [{ name: 'X', value: '1' }],
                    params: [
                        { name: 'q', value: '1', type: 'query' },
                        { name: 'id', value: '7', type: 'path' },
                    ],
                    body: { type: 'json', data: '{}' },
                    auth: { type: 'bearer', token: 't' },
                },
                docs: 'Una nota',
            },
            'Alta',
        );

        expect(request).toEqual(
            requestNode({
                name: 'Alta',
                seq: 2,
                method: 'POST',
                url: 'https://api.test/pets/:id?q=1',
                description: 'Una nota',
                headers: [{ name: 'X', value: '1', disabled: false }],
                params: [{ name: 'q', value: '1', disabled: false }],
                pathParams: [{ name: 'id', value: '7', disabled: false }],
                body: bodyNode('json', { text: '{}' }),
                auth: { type: 'bearer', token: 't' },
            }),
        );
    });

    it('reads a GraphQL request, whose method is POST unless it says another', () => {
        const request = requestOf({ graphql: { url: 'u', body: { query: '{ a }' } } }, 'G');

        expect(request).toMatchObject({
            method: 'POST',
            url: 'u',
            body: bodyNode('graphql', { text: '{ a }' }),
        });
    });

    it('takes GET for an HTTP request that names no method, and no sequence puts it last', () => {
        expect(requestOf({ http: {} }, 'A')).toMatchObject({
            method: 'GET',
            url: '',
            seq: Number.MAX_SAFE_INTEGER,
        });
    });

    it('names what the request keeps that Mandor has no place for', () => {
        const request = requestOf(
            {
                http: {},
                info: {},
                runtime: {
                    scripts: [{ code: 'x' }],
                    assertions: [{ expression: 'x' }],
                    actions: [{}],
                    variables: [{ name: 'a' }],
                },
                examples: 'x',
            },
            'A',
        );

        expect(request?.leftOut).toEqual([
            'scripts',
            'assertions',
            'actions',
            'request variables',
            'examples',
        ]);
    });

    it('keeps the tags of the request', () => {
        expect(requestOf({ http: {}, info: { tags: ['smoke'] } }, 'A')).toMatchObject({
            tags: ['smoke'],
            leftOut: [],
        });
    });

    it('gives no request for an item that is neither HTTP nor GraphQL', () => {
        expect(requestOf({ info: { type: 'websocket' } }, 'A')).toBeUndefined();
        expect(requestOf({ http: null, graphql: null }, 'A')).toBeUndefined();
    });

    it('reads the settings and the examples of the request', () => {
        const request = requestOf(
            {
                http: {},
                settings: { timeout: 5, followRedirects: 'inherit' },
                examples: [{ name: 'Ok', response: { status: 200 } }],
            },
            'A',
        );

        expect(request?.settings).toEqual({ timeout: 5 });
        expect(request?.examples[0]).toMatchObject({ name: 'Ok', status: '200' });
        expect(request?.leftOut).toEqual([]);
    });
});
