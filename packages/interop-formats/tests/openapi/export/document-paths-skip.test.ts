import { describe, expect, it } from 'vitest';

import { pathsOfDocument } from '../../../src/openapi/export/document-paths.js';
import { documentOf, httpOf, operationOf } from '../support/paths-document.js';

describe('what each operation of the document says', () => {
    it('skips the methods OpenAPI does not name and the repeated pairs, the first one wins', () => {
        const ir = documentOf({
            operations: [
                operationOf({ http: httpOf({ method: 'PROPFIND' }) }),
                operationOf({
                    name: 'primero',
                    http: httpOf({ method: 'GET', summary: 'primero' }),
                }),
                operationOf({
                    name: 'segundo',
                    http: httpOf({ method: 'GET', summary: 'segundo' }),
                }),
            ],
        });
        const paths = pathsOfDocument(ir);

        expect(Object.keys(paths)).toEqual(['/pets']);
        expect(paths['/pets']).toEqual({ get: { summary: 'primero' } });
    });

    it('names no operation for one that only speaks a message', () => {
        const ir = documentOf({
            operations: [
                {
                    name: 'evento',
                    channel: 'pedidos',
                    direction: 'outgoing',
                    security: [],
                    extras: {},
                },
            ],
        });

        expect(pathsOfDocument(ir)).toEqual({});
    });

    it('says what the channel said of the route, and drops a schema no JSON reads', () => {
        const ir = documentOf({
            channels: [
                { name: '/pets', address: '/pets', description: 'las mascotas', extras: {} },
            ],
            operations: [
                operationOf({
                    http: httpOf({
                        parameters: [
                            {
                                name: 'limit',
                                in: 'query',
                                required: false,
                                value: '1',
                                schema: '{no}',
                            },
                        ],
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)).toEqual({
            '/pets': {
                description: 'las mascotas',
                get: {
                    summary: undefined,
                    parameters: [{ name: 'limit', in: 'query', schema: {}, example: '1' }],
                },
            },
        });
    });

    it('keeps what the operation says of itself, and drops a schema that reads as a list', () => {
        const ir = documentOf({
            channels: [{ name: '/otra', address: '/otra', description: 'no matchea', extras: {} }],
            operations: [
                operationOf({
                    http: httpOf({
                        description: 'el listado',
                        parameters: [
                            {
                                name: 'limit',
                                in: 'query',
                                required: false,
                                value: '1',
                                schema: '[1]',
                            },
                        ],
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)).toEqual({
            '/pets': {
                get: {
                    summary: undefined,
                    description: 'el listado',
                    parameters: [{ name: 'limit', in: 'query', schema: {}, example: '1' }],
                },
            },
        });
    });
});
