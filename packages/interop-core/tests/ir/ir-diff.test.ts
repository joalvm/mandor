import { describe, expect, it } from 'vitest';

import type { InteropMessage, InteropOperation } from '../../src/ir/interop-document.js';
import { irDiff } from '../../src/ir/ir-diff.js';
import { documentOf, serverOf } from '../support/interop-document.js';

describe('comparing two documents of the intermediate model', () => {
    it('says nothing when the two documents hold the same thing in another order', () => {
        const left = documentOf({
            channels: [
                { name: 'pedidos', address: 'pedidos/entrantes', extras: {} },
                { name: 'recibos', address: 'recibos/salientes', extras: {} },
            ],
            operations: [
                {
                    name: 'recibirRecibo',
                    channel: 'recibos',
                    direction: 'outgoing',
                    security: [],
                    extras: {},
                },
                {
                    name: 'registrarPedido',
                    channel: 'pedidos',
                    direction: 'incoming',
                    security: [],
                    extras: {},
                },
            ],
        });
        const right = documentOf({
            channels: [...left.channels].toReversed(),
            operations: [...left.operations].toReversed(),
        });

        expect(irDiff(left, right)).toEqual([]);
    });

    it('names the field that carries different content', () => {
        const left = documentOf({
            servers: [serverOf('produccion', 'wss://pasarela.ejemplo.com/v1')],
        });
        const right = documentOf({
            servers: [serverOf('produccion', 'wss://otra.ejemplo.com/v1')],
        });

        expect(irDiff(left, right)).toEqual(['servers.produccion.url']);
    });

    it('reads a ref path as addressing, not as content', () => {
        const message: InteropMessage = {
            name: 'reciboEmitido',
            examples: [],
            extras: { $ref: '#/channels/recibos/messages/recibo' },
        };
        const operation: InteropOperation = {
            name: 'recibirRecibo',
            channel: 'recibos',
            direction: 'outgoing',
            security: [],
            extras: {},
            message,
        };
        const left = documentOf({ operations: [{ ...operation }] });
        const right = documentOf({
            operations: [
                {
                    ...operation,
                    message: {
                        ...message,
                        extras: { $ref: '#/components/messages/reciboEmitido' },
                    },
                },
            ],
        });

        expect(irDiff(left, right)).toEqual([]);
    });

    it('ignores the identity of the bytes the document came from', () => {
        expect(irDiff(documentOf(), documentOf({ sourceId: 'pasarela@2' }))).toEqual([]);
    });

    it('names what only one of the two documents holds', () => {
        const left = documentOf({
            operations: [
                {
                    name: 'registrarPedido',
                    channel: 'pedidos',
                    direction: 'incoming',
                    security: [],
                    extras: {},
                },
            ],
        });

        expect(irDiff(left, documentOf())).toEqual(['operations.registrarPedido']);
    });

    it('tells a reordered example list from a changed one', () => {
        const message: InteropMessage = {
            name: 'recibo',
            examples: ['{"id":"1"}', '{"id":"2"}'],
            extras: {},
        };
        const operation: InteropOperation = {
            name: 'recibirRecibo',
            channel: 'recibos',
            direction: 'outgoing',
            security: [],
            extras: {},
            message,
        };
        const left = documentOf({ operations: [{ ...operation }] });
        const sameContent = documentOf({ operations: [{ ...operation }] });
        const reordered = documentOf({
            operations: [
                {
                    ...operation,
                    message: { ...message, examples: ['{"id":"2"}', '{"id":"1"}'] },
                },
            ],
        });

        expect(irDiff(left, sameContent)).toEqual([]);
        expect(irDiff(left, reordered)).not.toEqual([]);
    });
});
