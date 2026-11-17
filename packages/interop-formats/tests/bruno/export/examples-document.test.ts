import type { RequestExample, RequestItem, ResponseCookie } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { examplesOfOpenCollection } from '../../../src/bruno/document/read-oc-example.js';
import { examplesDocumentOf } from '../../../src/bruno/export/examples-document.js';
import { examplesOf } from '../../../src/bruno/import/examples-of.js';

const REQUEST: RequestItem = {
    name: 'Pide',
    method: 'POST',
    url: 'https://x/a',
    query: [],
    headers: [],
    pathParams: [],
    body: { type: 'none' },
    examples: [],
    settings: {},
};

const EXAMPLE: RequestExample = {
    name: 'Creado',
    status: '201',
    contentType: 'application/json',
    body: '{}',
};

function withExamples(...examples: RequestExample[]): RequestItem {
    return { ...REQUEST, examples };
}

function documentOf(example: RequestExample): Record<string, unknown> {
    const { examples } = examplesDocumentOf(withExamples(example)) as {
        examples: Record<string, unknown>[];
    };

    return examples[0] ?? {};
}

describe('the examples of a request in OpenCollection', () => {
    it('writes no key for a request with none', () => {
        expect(examplesDocumentOf(REQUEST)).toEqual({});
    });

    it('writes the answer, its type among the headers and its body by kind', () => {
        expect(documentOf(EXAMPLE)).toEqual({
            name: 'Creado',
            response: {
                status: 201,
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                body: { type: 'json', data: '{}' },
            },
        });
    });

    it.each([
        ['text/html', 'html'],
        ['application/xml', 'xml'],
        ['text/csv', 'text'],
    ])('names %s a body of kind %s', (contentType, type) => {
        expect(documentOf({ ...EXAMPLE, contentType })['response']).toMatchObject({
            body: { type },
        });
    });

    it('does not repeat a type the headers already say, and says none when it has none', () => {
        const headers: [string, string][] = [['content-type', 'text/csv']];

        expect(documentOf({ ...EXAMPLE, headers })['response']).toMatchObject({
            headers: [{ name: 'content-type', value: 'text/csv' }],
        });
        expect(documentOf({ ...EXAMPLE, contentType: '' })['response']).toMatchObject({
            headers: [],
        });
    });

    it('leaves unsaid a status that is not a number', () => {
        expect(documentOf({ ...EXAMPLE, status: 'default' })['response']).not.toHaveProperty(
            'status',
        );
    });

    it('writes its cookies as the headers that set them', () => {
        const cookies: ResponseCookie[] = [
            {
                name: 'sid',
                value: '1',
                domain: 'x',
                path: '/',
                expires: 'mañana',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            },
            { name: 'plain', value: '2', httpOnly: false, secure: false },
        ];
        const { response } = documentOf({ ...EXAMPLE, cookies }) as {
            response: { headers: { name: string; value: string }[] };
        };

        expect(response.headers.slice(1)).toEqual([
            {
                name: 'Set-Cookie',
                value: 'sid=1; Domain=x; Path=/; Expires=mañana; HttpOnly; Secure; SameSite=lax',
            },
            { name: 'Set-Cookie', value: 'plain=2' },
        ]);
    });

    it('writes the request only when the example changes it', () => {
        const document = documentOf({
            ...EXAMPLE,
            request: {
                headers: [{ key: 'a', value: 'b', enabled: true }],
                body: { type: 'text', content: 'hola' },
                description: 'Otra',
            },
        });

        expect(document['description']).toBe('Otra');
        expect(document['request']).toEqual({
            method: 'POST',
            url: 'https://x/a',
            headers: [{ name: 'a', value: 'b' }],
            body: { type: 'text', data: 'hola' },
        });
    });

    it('writes no body for an example sent with a query, nor for one sent with none', () => {
        const query = documentOf({
            ...EXAMPLE,
            request: { body: { type: 'graphql', query: '{a}', variables: '' } },
        });
        const none = documentOf({ ...EXAMPLE, request: { description: 'Otra' } });

        expect(query['request']).not.toHaveProperty('body');
        expect(none['request']).not.toHaveProperty('body');
    });

    it('reads back what it wrote', () => {
        const example: RequestExample = {
            ...EXAMPLE,
            headers: [
                ['Content-Type', 'application/json'],
                ['x-a', '1'],
            ],
            request: { query: [{ key: 'q', value: '1', enabled: true }], description: 'Otra' },
        };
        const { examples: written } = examplesDocumentOf(withExamples(example));
        const { examples } = examplesOf(examplesOfOpenCollection(written).examples, REQUEST);

        expect(examples).toEqual([example]);
    });
});
