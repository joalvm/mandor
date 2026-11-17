import { describe, expect, it } from 'vitest';

import { pathsOfDocument } from '../../../src/openapi/export/document-paths.js';
import { documentOf, httpOf, operationOf } from '../support/paths-document.js';

describe('the responses the operations of the document show', () => {
    it('names an example that does not answer to its status by its own name', () => {
        const ir = documentOf({
            operations: [
                operationOf({
                    http: httpOf({
                        responses: [
                            {
                                name: 'mascota',
                                status: '200',
                                contentType: 'application/json',
                                body: '{"name":"Firulais"}',
                            },
                        ],
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)['/pets']).toEqual({
            get: {
                responses: {
                    '200': {
                        description: '',
                        content: {
                            'application/json': {
                                schema: {},
                                examples: { mascota: { value: { name: 'Firulais' } } },
                            },
                        },
                    },
                },
            },
        });
    });

    it('maps the named examples a status shows together', () => {
        const ir = documentOf({
            operations: [
                operationOf({
                    http: httpOf({
                        responses: [
                            {
                                name: '200',
                                status: '200',
                                contentType: 'application/json',
                                body: '{"name":"Firulais"}',
                            },
                            {
                                name: 'otra',
                                status: '200',
                                contentType: 'application/json',
                                body: '[]',
                            },
                        ],
                    }),
                }),
            ],
        });

        expect(pathsOfDocument(ir)['/pets']).toEqual({
            get: {
                responses: {
                    '200': {
                        description: '',
                        content: {
                            'application/json': {
                                schema: {},
                                examples: {
                                    '200': { value: { name: 'Firulais' } },
                                    otra: { value: [] },
                                },
                            },
                        },
                    },
                },
            },
        });
    });

    it('writes a lone response as the example of its status, the named ones as a map', () => {
        const ir = documentOf({
            operations: [
                operationOf({
                    http: httpOf({
                        responses: [
                            {
                                name: '200',
                                status: '200',
                                contentType: 'application/json',
                                body: '[]',
                            },
                        ],
                    }),
                }),
                operationOf({
                    name: 'muestra',
                    channel: '/mascotas/{petId}',
                    http: {
                        ...httpOf({ path: '/mascotas/{petId}' }),
                        responses: [
                            {
                                name: 'mascota',
                                status: '200',
                                contentType: 'application/json',
                                body: '{"name":"Firulais"}',
                            },
                        ],
                    },
                }),
            ],
        });
        const paths = pathsOfDocument(ir);

        expect(paths['/pets']).toEqual({
            get: {
                summary: undefined,
                responses: {
                    '200': {
                        description: '',
                        content: { 'application/json': { schema: {}, example: [] } },
                    },
                },
            },
        });
        expect(paths['/mascotas/{petId}']).toEqual({
            get: {
                summary: undefined,
                responses: {
                    '200': {
                        description: '',
                        content: {
                            'application/json': {
                                schema: {},
                                examples: { mascota: { value: { name: 'Firulais' } } },
                            },
                        },
                    },
                },
            },
        });
    });
});
