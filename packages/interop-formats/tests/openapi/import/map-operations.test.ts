import { describe, expect, it } from 'vitest';

import { operationsOf } from '../../../src/openapi/import/map-operations.js';

const PATHS = {
    '/pets': {
        summary: 'Pets',
        parameters: [{ name: 'limit', in: 'query', example: 5 }],
        get: {
            summary: 'List pets',
            description: 'All of them',
            tags: ['pets', 3],
            operationId: 'listPets',
            deprecated: true,
            responses: {},
        },
        post: { security: [] },
        'x-note': { get: { summary: 'not an operation' } },
    },
    '/pets/{id}': { delete: { security: [{ key: [] }] } },
};

describe('the operations of an OpenAPI document', () => {
    it('makes one per path and method, outgoing, travelling the channel of its path', () => {
        const operations = operationsOf({ paths: PATHS });

        expect(
            operations.map((operation) => [operation.name, operation.channel, operation.direction]),
        ).toEqual([
            ['List pets', '/pets', 'outgoing'],
            ['POST /pets', '/pets', 'outgoing'],
            ['DELETE /pets/{id}', '/pets/{id}', 'outgoing'],
        ]);
    });

    it('says what the request needs: method, path, tags, parameters and security', () => {
        const [list, post, remove] = operationsOf({ paths: PATHS });

        expect(list?.http).toMatchObject({
            method: 'GET',
            path: '/pets',
            summary: 'List pets',
            description: 'All of them',
            tags: ['pets'],
            parameters: [{ name: 'limit', in: 'query', value: '5' }],
            responses: [],
            security: null,
        });
        expect(post?.http?.security).toEqual([]);
        expect(remove?.http?.security).toEqual(['key']);
    });

    it('keeps what the mapping has no place for, and leaves the message to the other formats', () => {
        const [list] = operationsOf({ paths: PATHS });

        expect(list?.extras).toEqual({ operationId: 'listPets', deprecated: true });
        expect(list?.message).toBeUndefined();
        expect(list?.security).toEqual([]);
    });
});
