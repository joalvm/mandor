import { describe, expect, it } from 'vitest';

import { pathsOfDocument } from '../../../src/openapi/export/document-paths.js';
import { documentOf, httpOf, operationOf } from '../support/paths-document.js';

describe('the content the operations of the document carry', () => {
    it('writes the example a parameter carries, and nothing when it falls to the schema default', () => {
        const ir = documentOf({
            operations: [
                operationOf({
                    http: httpOf({
                        parameters: [
                            {
                                name: 'limit',
                                in: 'query',
                                required: false,
                                value: '',
                                schema: '{"type":"integer","default":10}',
                            },
                            { name: 'off', in: 'query', required: false, value: '' },
                        ],
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)['/pets']).toEqual({
            get: {
                summary: undefined,
                parameters: [
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', default: 10 },
                        example: '',
                    },
                    { name: 'off', in: 'query', schema: {} },
                ],
            },
        });
    });

    it('names the body example and the schema of the content it speaks', () => {
        const ir = documentOf({
            operations: [
                operationOf({
                    http: httpOf({
                        method: 'POST',
                        requestBody: {
                            contentType: 'application/json',
                            value: '{"a":1}',
                            schema: '{"type":"object"}',
                            required: false,
                        },
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)['/pets']).toEqual({
            post: {
                summary: undefined,
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { type: 'object' },
                            example: { a: 1 },
                        },
                    },
                },
            },
        });
    });
});
