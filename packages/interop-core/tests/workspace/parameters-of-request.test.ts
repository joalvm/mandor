import { type CollectionItem, parseRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { parametersOf } from '../../src/workspace/parameters-of-request.js';

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

describe('the rows of a request as the parameters the document names', () => {
    it('carries the rows, the cookie split apart and the empty rows left out', () => {
        const parameters = parametersOf(
            parseRequestItem(
                requestItem({
                    method: 'POST',
                    url: '{{baseUrl}}/pets/{petId}?ver=1',
                    pathParams: [{ key: 'petId', value: '{{petId}}', enabled: true }],
                    query: [
                        {
                            key: 'limit',
                            value: '10',
                            enabled: true,
                            required: true,
                            schema: '{"type":"integer"}',
                        },
                        { key: 'off', value: '0', enabled: false },
                        { key: '', value: 'x', enabled: true },
                    ],
                    headers: [
                        { key: 'Cookie', value: 'a=1; b=2', enabled: true },
                        { key: 'X-Otro', value: 'v', enabled: true },
                    ],
                }),
            ),
        );

        expect(parameters).toEqual([
            { name: 'petId', in: 'path', required: true, value: '{{petId}}' },
            {
                name: 'limit',
                in: 'query',
                required: true,
                value: '10',
                schema: '{"type":"integer"}',
            },
            { name: 'off', in: 'query', required: false, value: '0' },
            { name: 'X-Otro', in: 'header', required: false, value: 'v' },
            { name: 'a', in: 'cookie', required: false, value: '1' },
            { name: 'b', in: 'cookie', required: false, value: '2' },
        ]);
    });

    it('drops a row schema that no JSON parses', () => {
        const parameters = parametersOf(
            parseRequestItem(
                requestItem({
                    query: [{ key: 'limit', value: '10', enabled: true, schema: '{no}' }],
                }),
            ),
        );

        expect(parameters).toEqual([{ name: 'limit', in: 'query', required: false, value: '10' }]);
    });
});
