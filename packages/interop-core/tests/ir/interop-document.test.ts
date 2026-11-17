import { describe, expect, it } from 'vitest';

import type {
    InteropChannel,
    InteropDocument,
    InteropOperation,
} from '../../src/ir/interop-document.js';

const channel: InteropChannel = {
    name: 'pedidos',
    address: 'pedidos.creado',
    extras: {},
};

const operation: InteropOperation = {
    name: 'pedido creado',
    channel: 'pedidos',
    direction: 'incoming',
    security: [],
    extras: {},
};

describe('the intermediate document', () => {
    it('carries the service name and the identity of its source', () => {
        const document: InteropDocument = {
            name: 'Pasarela de pagos',
            sourceId: 'pasarela@1',
            servers: [],
            security: {},
            channels: [channel],
            operations: [operation],
            defaultSecurity: [],
            payloadSchemas: {},
            notes: [],
            extras: { 'x-unknown': true },
        };

        expect(document.name).toBe('Pasarela de pagos');
        expect(document.sourceId).toBe('pasarela@1');
        expect(document.extras).toEqual({ 'x-unknown': true });
    });

    it('keeps a payload schema as text, because the text is the contract', () => {
        const document: InteropDocument = {
            name: 'Pasarela',
            sourceId: 'pasarela@1',
            servers: [],
            security: {},
            channels: [],
            operations: [],
            defaultSecurity: [],
            payloadSchemas: { pedido: { text: '{"type":"object"}', extras: {} } },
            notes: [],
            extras: {},
        };

        expect(document.payloadSchemas['pedido']?.text).toBe('{"type":"object"}');
    });
});
