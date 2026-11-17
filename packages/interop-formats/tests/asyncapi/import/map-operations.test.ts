import { describe, expect, it } from 'vitest';

import { operationsOf } from '../../../src/asyncapi/import/map-operations.js';
import { parseAsyncapiDocument } from '../../../src/asyncapi/document/parse-asyncapi-document.js';

const document2 = JSON.stringify({
    asyncapi: '2.6.0',
    info: { title: 't', version: '1' },
    channels: {
        'pedidos/entrantes': {
            publish: {
                operationId: 'registrarPedido',
                summary: 'Da de alta un pedido',
                message: { name: 'pedido', payload: { type: 'object' } },
            },
        },
    },
});

describe('operationsOf', () => {
    it('maps every operation with its channel, its flipped direction and its message', async () => {
        const { document, raw } = await parseAsyncapiDocument(document2);
        const operations = operationsOf(document, raw, {}, {});

        expect(operations).toHaveLength(1);
        const operation = operations[0];

        if (operation === undefined) {
            throw new Error('the document has one operation and it was not mapped');
        }

        expect(operation).toMatchObject({
            name: 'registrarPedido',
            channel: 'pedidos/entrantes',
            direction: 'incoming',
            security: [],
        });
        expect(operation.message).toMatchObject({ name: 'pedido', payloadType: 'json' });
    });

    it('keeps what it does not map of the operation — the summary rides along', async () => {
        const { document, raw } = await parseAsyncapiDocument(document2);
        const operations = operationsOf(document, raw, {}, {});

        expect(operations[0]?.extras).toEqual({
            summary: 'Da de alta un pedido',
        });
    });
});
