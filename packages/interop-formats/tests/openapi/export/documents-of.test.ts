import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/openapi/export/documents-of.js';

const REQUEST: CollectionItem = {
    kind: 'request',
    name: 'listaMascotas',
    tags: [],
    body: {
        method: 'GET',
        url: '{{baseUrl}}/pets',
        body: { type: 'none' },
        examples: [],
        settings: {
            timeoutMs: 30_000,
            followRedirects: true,
            maxRedirects: 5,
            validateTls: true,
        },
    },
};

describe('the OpenAPI document of a workspace', () => {
    it('is one OpenAPI 3.1 document, in a YAML file named after the workspace', () => {
        const files = documentsOf({
            name: 'Tienda de Mascotas',
            connections: [],
            environments: [],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'Tienda',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [REQUEST],
                },
            ],
        });

        expect(files.map((file) => file.path)).toEqual(['tienda-de-mascotas.yaml']);
        expect(files[0]?.document).toMatchObject({
            openapi: '3.1.0',
            info: { title: 'Tienda de Mascotas' },
            paths: { '/pets': { get: {} } },
        });
    });
});
