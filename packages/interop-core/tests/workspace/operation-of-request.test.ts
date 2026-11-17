import { describe, expect, it } from 'vitest';

import type { CollectionItem, ConcreteAuth } from '@mandor/schema';

import { operationOfRequest } from '../../src/workspace/operation-of-request.js';

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

function context(
    defaultSecurity: string[] = [],
    nameOf: (auth: ConcreteAuth) => string | null = () => null,
) {
    return { nameOf, defaultSecurity };
}

describe('one request as the operation it sends', () => {
    it('speaks the path of the url, the method and the tag of its folder', () => {
        const operation = operationOfRequest(requestItem(), { name: 'mascotas' }, context());

        expect(operation.channel).toBe('/pets');
        expect(operation.direction).toBe('outgoing');
        expect(operation.message).toBeUndefined();
        expect(operation.security).toEqual([]);
        expect(operation.http).toMatchObject({
            method: 'GET',
            path: '/pets',
            summary: 'listaMascotas',
            tags: ['mascotas'],
        });
        expect(operation.http?.parameters).toEqual([]);
    });

    it('says the tag of the folder first, then the ones of the item, once each', () => {
        const item = { ...requestItem(), tags: ['beta', 'mascotas'] };
        const operation = operationOfRequest(item, { name: 'mascotas' }, context());

        expect(operation.http?.tags).toEqual(['mascotas', 'beta']);
    });

    it('names no tag for a request at the top of the collection', () => {
        const operation = operationOfRequest(requestItem(), null, context());

        expect(operation.http?.tags).toEqual([]);
    });

    it('carries the examples of the request as the responses the document shows', () => {
        const operation = operationOfRequest(
            requestItem({
                examples: [
                    { name: '200', status: '200', contentType: 'application/json', body: '[]' },
                ],
            }),
            null,
            context(),
        );

        expect(operation.http?.responses).toEqual([
            { name: '200', status: '200', contentType: 'application/json', body: '[]' },
        ]);
    });

    it('carries the schema of the answer of each example', () => {
        const example = { name: '200', status: '200', contentType: 'application/json', body: '[]' };
        const operation = operationOfRequest(
            requestItem({ examples: [{ ...example, schema: '{"type":"array"}' }] }),
            null,
            context(),
        );

        expect(operation.http?.responses).toEqual([{ ...example, schema: '{"type":"array"}' }]);
        expect(operation.extras).toEqual({});
    });

    /** The interop schema is strict: what an example grew for the tree must not cross into it. */
    it('leaves out of the responses what only the example knows', () => {
        const operation = operationOfRequest(
            requestItem({
                examples: [
                    {
                        name: '200',
                        status: '200',
                        contentType: 'application/json',
                        body: '[]',
                        headers: [['x-a', '1']],
                        request: { headers: [] },
                    },
                ],
            }),
            null,
            context(),
        );

        expect(operation.http?.responses).toEqual([
            { name: '200', status: '200', contentType: 'application/json', body: '[]' },
        ]);
    });

    it.each([
        ['no auth', { type: 'none' } satisfies ConcreteAuth, ['bearerAuth'], [] as string[] | null],
        ['own schema', { type: 'bearer', token: 't' } satisfies ConcreteAuth, [], ['bearerAuth']],
    ])('answers %s as the item asks it', (_name, auth, defaultSecurity, expected) => {
        const operation = operationOfRequest(
            requestItem({ auth }),
            null,
            context(defaultSecurity, () => 'bearerAuth'),
        );

        expect(operation.http?.security).toEqual(expected);
    });

    it('answers inherit for a no-auth the default already says', () => {
        const operation = operationOfRequest(
            requestItem({ auth: { type: 'none' } }),
            null,
            context([], () => 'bearerAuth'),
        );

        expect(operation.http?.security).toBeNull();
    });

    it('inherits the folder the item defers to', () => {
        const folder = {
            name: 'mascotas',
            auth: { type: 'bearer', token: 't' } satisfies ConcreteAuth,
        };

        const operation = operationOfRequest(
            requestItem(),
            folder,
            context([], () => 'bearerAuth'),
        );

        expect(operation.http?.security).toEqual(['bearerAuth']);
    });

    it('answers inherit for a chain nobody fills', () => {
        const operation = operationOfRequest(requestItem(), null, context());

        expect(operation.http?.security).toBeNull();
    });

    it('answers inherit when the chain repeats the default', () => {
        const operation = operationOfRequest(
            requestItem({ auth: { type: 'bearer', token: 't' } }),
            null,
            context(['bearerAuth'], () => 'bearerAuth'),
        );

        expect(operation.http?.security).toBeNull();
    });

    it('keeps what the body holds that no request field claimed', () => {
        const operation = operationOfRequest(
            requestItem({ operationId: 'listPets', 'x-interno': true }),
            null,
            context(),
        );

        expect(operation.extras).toEqual({ operationId: 'listPets', 'x-interno': true });
    });
});
