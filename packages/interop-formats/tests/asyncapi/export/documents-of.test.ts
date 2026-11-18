import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/asyncapi/export/documents-of.js';

const MESSAGE: CollectionItem = {
    kind: 'message',
    name: 'registrarPedido',
    tags: [],
    body: { channel: 'pedidos', direction: 'incoming', payload: '', payloadType: 'json' },
};

describe('the AsyncAPI document of a workspace', () => {
    it('is one AsyncAPI 3 document, in a YAML file named after the workspace', () => {
        const files = documentsOf({
            name: 'Pasarela de Pedidos',
            connections: [],
            environments: [],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'tienda',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [MESSAGE],
                },
            ],
        });

        expect(files.map((file) => file.path)).toEqual(['pasarela-de-pedidos.yaml']);
        expect(files[0]?.document).toMatchObject({
            asyncapi: '3.0.0',
            info: { title: 'Pasarela de Pedidos' },
            operations: { registrarPedido: { action: 'send' } },
        });
    });
});
