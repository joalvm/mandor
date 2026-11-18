import { describe, expect, it } from 'vitest';

import { trafficOfDocument } from '../../../src/asyncapi/export/document-operations.js';
import type { InteropDocument } from '@mandor/interop-core';

function document(overrides: Partial<InteropDocument> = {}): InteropDocument {
    return {
        name: 'Almacen',
        sourceId: '',
        servers: [],
        security: {},
        channels: [{ name: 'pedidos', address: 'pedidos/entrantes', extras: {} }],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
        ...overrides,
    };
}

const SCHEMA = { text: '{"type":"object"}', extras: {} };

describe('writing the traffic of the document', () => {
    it('flips the arrow: what Mandor sends, the application receives', () => {
        const traffic = trafficOfDocument(
            document({
                operations: [
                    {
                        name: 'registrarPedido',
                        channel: 'pedidos',
                        direction: 'incoming',
                        security: [],
                        extras: {},
                    },
                    {
                        name: 'recibirRecibo',
                        channel: 'pedidos',
                        direction: 'outgoing',
                        security: [],
                        extras: {},
                    },
                ],
            }),
        );

        expect(traffic.operations).toMatchObject({
            registrarPedido: { action: 'send', channel: { $ref: '#/channels/pedidos' } },
            recibirRecibo: { action: 'receive', channel: { $ref: '#/channels/pedidos' } },
        });
    });

    it('keeps a schema of one operation beside its channel, with its alias', () => {
        const traffic = trafficOfDocument(
            document({
                operations: [
                    {
                        name: 'registrarPedido',
                        channel: 'pedidos',
                        direction: 'incoming',
                        security: [],
                        message: {
                            name: 'pedido',
                            payloadSchema: 'pedido',
                            examples: [],
                            extras: {},
                        },
                        extras: {},
                    },
                ],
                payloadSchemas: { pedido: SCHEMA },
            }),
        );

        expect(traffic.channels['pedidos']).toMatchObject({
            messages: { pedido: { payload: { type: 'object' } } },
        });
        expect(traffic.components).toEqual({});
        const operations = traffic.operations as Record<string, { messages?: unknown }>;

        expect(operations['registrarPedido']?.messages).toEqual([
            { $ref: '#/channels/pedidos/messages/pedido' },
        ]);
    });

    it('moves the schema several operations promise to components, and points at it twice', () => {
        const message = { name: 'recibo', payloadSchema: 'recibo', examples: [], extras: {} };
        const traffic = trafficOfDocument(
            document({
                channels: [
                    { name: 'recibos', address: 'recibos/salientes', extras: {} },
                    { name: 'avisos', address: 'avisos/salientes', extras: {} },
                ],
                operations: [
                    {
                        name: 'recibirRecibo',
                        channel: 'recibos',
                        direction: 'outgoing',
                        security: [],
                        message,
                        extras: {},
                    },
                    {
                        name: 'notificarRecibo',
                        channel: 'avisos',
                        direction: 'outgoing',
                        security: [],
                        message,
                        extras: {},
                    },
                ],
                payloadSchemas: { recibo: SCHEMA },
            }),
        );

        expect(traffic.components).toMatchObject({
            messages: { recibo: { payload: { type: 'object' } } },
        });
        expect(traffic.channels['recibos']).toMatchObject({
            messages: { recibo: { $ref: '#/components/messages/recibo' } },
        });
        const shared = traffic.operations as Record<string, { messages?: unknown }>;

        expect(shared['recibirRecibo']?.messages).toEqual([
            { $ref: '#/channels/recibos/messages/recibo' },
        ]);
        expect(shared['notificarRecibo']?.messages).toEqual([
            { $ref: '#/channels/avisos/messages/recibo' },
        ]);
    });

    it('escapes a channel name in the pointers, and never in the keys', () => {
        const traffic = trafficOfDocument(
            document({
                channels: [{ name: 'pedidos/entrantes', address: 'pedidos/entrantes', extras: {} }],
                operations: [
                    {
                        name: 'registrarPedido',
                        channel: 'pedidos/entrantes',
                        direction: 'incoming',
                        security: [],
                        extras: {},
                    },
                ],
            }),
        );

        expect(Object.keys(traffic.channels)).toEqual(['pedidos/entrantes']);
        expect(traffic.operations['registrarPedido']).toMatchObject({
            channel: { $ref: '#/channels/pedidos~1entrantes' },
        });
    });
});
