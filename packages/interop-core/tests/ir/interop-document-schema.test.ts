import { describe, expect, it } from 'vitest';

import { interopDocumentSchema } from '../../src/ir/interop-document-schema.js';

const message = {
    payload: '{"id":"{{pedidoId}}"}',
    payloadType: 'json',
    payloadSchema: 'pedido',
    examples: ['{"id":"1"}'],
    extras: {},
};

const base = {
    name: 'Pasarela de pagos',
    sourceId: 'pasarela@1',
    servers: [
        {
            name: 'produccion',
            url: 'wss://pagos.ejemplo.com',
            protocol: 'websocket',
            security: ['api-key'],
            variables: {},
            extras: {},
        },
    ],
    security: { 'api-key': { type: 'apiKey', extras: {} } },
    channels: [{ name: 'pedidos', address: 'pedidos.creado', extras: {} }],
    operations: [
        {
            name: 'pedido creado',
            channel: 'pedidos',
            direction: 'incoming',
            message,
            security: [],
            extras: {},
        },
    ],
    defaultSecurity: [],
    payloadSchemas: { pedido: { text: '{"type":"object"}', extras: {} } },
    notes: [],
    extras: {},
};

describe('parsing an intermediate document', () => {
    it('reads a document with servers, security, channels, operations and payload schemas', () => {
        const document = interopDocumentSchema.parse(base);

        expect(document.servers[0]?.protocol).toBe('websocket');
        expect(document.operations[0]?.direction).toBe('incoming');
        expect(document.operations[0]?.message?.payloadSchema).toBe('pedido');
    });

    it('reads a document that names no message for an operation', () => {
        const document = interopDocumentSchema.parse({
            ...base,
            operations: [
                {
                    name: 'ping',
                    channel: 'pedidos',
                    direction: 'outgoing',
                    security: [],
                    extras: {},
                },
            ],
        });

        expect(document.operations[0]?.message).toBeUndefined();
    });

    it('refuses a direction that is not the two the client knows', () => {
        expect(
            interopDocumentSchema.safeParse({
                ...base,
                operations: [{ ...base.operations[0], direction: 'both' }],
            }).success,
        ).toBe(false);
    });

    it('refuses two channels with the same name, because a reference could not be read back', () => {
        expect(
            interopDocumentSchema.safeParse({
                ...base,
                channels: [
                    { name: 'pedidos', address: 'pedidos.creado', extras: {} },
                    { name: 'pedidos', address: 'pedidos.borrado', extras: {} },
                ],
            }).success,
        ).toBe(false);
    });

    it('refuses an operation that names a channel the document does not declare', () => {
        expect(
            interopDocumentSchema.safeParse({
                ...base,
                operations: [{ ...base.operations[0], channel: 'facturas' }],
            }).success,
        ).toBe(false);
    });

    it('refuses a message that names a payload schema the document does not declare', () => {
        expect(
            interopDocumentSchema.safeParse({
                ...base,
                operations: [
                    { ...base.operations[0], message: { ...message, payloadSchema: 'factura' } },
                ],
            }).success,
        ).toBe(false);
    });

    it('refuses an empty source identity, because it would identify nothing', () => {
        expect(interopDocumentSchema.safeParse({ ...base, sourceId: '  ' }).success).toBe(false);
    });

    it('refuses a default security, or an http one, that names a scheme nobody declared', () => {
        const http = {
            method: 'GET',
            path: '/p',
            tags: [],
            parameters: [],
            responses: [],
            security: ['ghost'],
        };
        const operation = {
            name: 'x',
            channel: 'pedidos',
            direction: 'outgoing',
            security: [],
            http,
            extras: {},
        };

        expect(
            interopDocumentSchema.safeParse({ ...base, defaultSecurity: ['ghost'] }).success,
        ).toBe(false);
        expect(interopDocumentSchema.safeParse({ ...base, operations: [operation] }).success).toBe(
            false,
        );
    });
});
