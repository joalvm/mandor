import { describe, expect, it } from 'vitest';

import { pathsOfDocument } from '../../../src/openapi/export/document-paths.js';
import { documentOf, httpOf, operationOf } from '../support/paths-document.js';

describe('the paths of the document', () => {
    it('groups the operations under their path, the known keys over the loose ones', () => {
        const ir = documentOf({
            channels: [{ name: '/pets', address: '/pets', extras: {} }],
            operations: [
                operationOf({
                    extras: { operationId: 'lista', 'x-interno': 1 },
                    http: httpOf({
                        method: 'GET',
                        summary: 'Lista mascotas',
                        tags: ['mascotas'],
                        parameters: [{ name: 'limit', in: 'query', required: true, value: '10' }],
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)).toEqual({
            '/pets': {
                get: {
                    operationId: 'lista',
                    'x-interno': 1,
                    summary: 'Lista mascotas',
                    tags: ['mascotas'],
                    parameters: [
                        { name: 'limit', in: 'query', required: true, schema: {}, example: '10' },
                    ],
                },
            },
        });
    });

    it('writes no security for an operation that inherits, and an empty list for one without', () => {
        const ir = documentOf({
            operations: [
                operationOf({ name: 'hereda', http: httpOf({ path: '/a', security: null }) }),
                operationOf({ name: 'sin-auth', http: httpOf({ path: '/b', security: [] }) }),
                operationOf({
                    name: 'propia',
                    http: httpOf({ path: '/c', security: ['basicAuth'] }),
                }),
            ],
        });
        const paths = pathsOfDocument(ir);

        expect(paths['/a']).toEqual({ get: {} });
        expect(paths['/b']).toEqual({ get: { security: [] } });
        expect(paths['/c']).toEqual({ get: { security: [{ basicAuth: [] }] } });
    });
});
