import { describe, expect, it } from 'vitest';

import { irToDocument } from '../../../src/openapi/export/interop-to-document.js';
import { documentOf } from '../support/interop-document.js';

describe('the model as the OpenAPI 3.1 document it describes', () => {
    it('declares the version, the title and the paths the operations ask for', () => {
        expect(irToDocument(documentOf())).toEqual({
            openapi: '3.1.0',
            info: { title: 'Pasarela', version: '1.0.0' },
            paths: {},
        });
    });

    it('unfolds the servers, the security and the schemes when the model speaks them', () => {
        const ir = documentOf({
            servers: [
                {
                    name: 'Produccion',
                    url: 'https://api.ejemplo.com/v1',
                    protocol: 'https',
                    security: [],
                    variables: {},
                    extras: {},
                },
            ],
            security: { bearerAuth: { type: 'http', extras: { scheme: 'bearer' } } },
            defaultSecurity: ['bearerAuth'],
            operations: [
                {
                    name: 'listaMascotas',
                    channel: '/pets',
                    direction: 'outgoing',
                    security: [],
                    http: {
                        method: 'GET',
                        path: '/pets',
                        tags: [],
                        parameters: [],
                        responses: [],
                        security: null,
                    },
                    extras: {},
                },
            ],
        });

        expect(irToDocument(ir)).toEqual({
            openapi: '3.1.0',
            info: { title: 'Pasarela', version: '1.0.0' },
            servers: [{ url: 'https://api.ejemplo.com/v1', description: 'Produccion' }],
            security: [{ bearerAuth: [] }],
            paths: { '/pets': { get: {} } },
            components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
        });
    });
});
