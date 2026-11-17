import { describe, expect, it } from 'vitest';

import type { InteropMessage, InteropOperation } from '../../src/ir/interop-document.js';
import { irDiff } from '../../src/ir/ir-diff.js';
import { documentOf, serverOf } from '../support/interop-document.js';

describe('comparing the fields the model names, one by one', () => {
    it('reads the default security as a set, and names it when it differs', () => {
        expect(
            irDiff(
                documentOf({ defaultSecurity: ['a', 'b'] }),
                documentOf({ defaultSecurity: ['b', 'a'] }),
            ),
        ).toEqual([]);
        expect(
            irDiff(documentOf({ defaultSecurity: ['a'] }), documentOf({ defaultSecurity: [] })),
        ).toEqual(['defaultSecurity']);
    });

    it('names the variables of a server that carry another default', () => {
        const left = documentOf({
            servers: [
                {
                    ...serverOf('produccion', 'https://a.b'),
                    variables: { port: { default: '80' } },
                },
            ],
        });
        const right = documentOf({
            servers: [
                {
                    ...serverOf('produccion', 'https://a.b'),
                    variables: { port: { default: '8080' } },
                },
            ],
        });

        expect(irDiff(left, right)).toEqual(['servers.produccion.variables']);
    });

    it('names every field of a channel and an operation that says something different', () => {
        const left = documentOf({
            channels: [
                { name: 'recibos', address: 'recibos/uno', description: 'los recibos', extras: {} },
            ],
            operations: [
                {
                    name: 'recibirRecibo',
                    channel: 'recibos/uno',
                    direction: 'incoming',
                    security: ['schemeA'],
                    extras: { x: 1 },
                },
            ],
        });
        const right = documentOf({
            channels: [
                {
                    name: 'recibos',
                    address: 'recibos/dos',
                    description: 'otra cosa',
                    extras: { y: 2 },
                },
            ],
            operations: [
                {
                    name: 'recibirRecibo',
                    channel: 'recibos/dos',
                    direction: 'outgoing',
                    security: ['schemeB'],
                    extras: { x: 2 },
                },
            ],
        });

        expect(irDiff(left, right)).toEqual([
            'channels.recibos.address',
            'channels.recibos.description',
            'channels.recibos.extras',
            'operations.recibirRecibo.channel',
            'operations.recibirRecibo.direction',
            'operations.recibirRecibo.security',
            'operations.recibirRecibo.extras',
        ]);
    });

    it('names the message of an operation one side carries and the other does not', () => {
        const operation = (message: InteropMessage | undefined): InteropOperation => ({
            name: 'recibirRecibo',
            channel: 'recibos',
            direction: 'outgoing',
            security: [],
            extras: {},
            message,
        });

        expect(
            irDiff(
                documentOf({ operations: [operation(undefined)] }),
                documentOf({
                    operations: [operation({ name: 'recibo', examples: [], extras: {} })],
                }),
            ),
        ).toEqual(['operations.recibirRecibo.message']);
    });
});
