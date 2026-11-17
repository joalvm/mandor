import { describe, expect, it } from 'vitest';

import { messageItemSchema } from '../../src/message/message-item-schema.js';

describe('messageItemSchema', () => {
    it('fills the defaults of a message with only a name', () => {
        expect(messageItemSchema.parse({ name: 'Pedido creado' })).toEqual({
            name: 'Pedido creado',
            payload: '',
            payloadType: 'json',
            schema: '',
        });
    });

    it('reads a message with everything it can say', () => {
        const message = {
            name: 'Pedido creado',
            channel: 'pedidos.creado',
            payload: '{"id":1}',
            description: 'Se emite al crear',
            payloadType: 'text',
            schema: '{}',
            expectAck: { enabled: true, timeoutMs: 5000 },
        };

        expect(messageItemSchema.parse(message)).toEqual(message);
    });

    it.each(['json', 'text', 'binary'])('reads %s as the payload type', (payloadType) => {
        expect(messageItemSchema.safeParse({ name: 'x', payloadType }).success).toBe(true);
    });

    it('refuses a payload type outside the closed list', () => {
        expect(messageItemSchema.safeParse({ name: 'x', payloadType: 'xml' }).success).toBe(false);
    });

    it('refuses a name or a channel made of whitespace only', () => {
        expect(messageItemSchema.safeParse({ name: ' ' }).success).toBe(false);
        expect(messageItemSchema.safeParse({ name: 'x', channel: '  ' }).success).toBe(false);
    });

    it('refuses an ack timeout that is zero, fractional or longer than an hour', () => {
        const withTimeout = (timeoutMs: number): boolean =>
            messageItemSchema.safeParse({ name: 'x', expectAck: { enabled: true, timeoutMs } })
                .success;

        expect(withTimeout(0)).toBe(false);
        expect(withTimeout(1.5)).toBe(false);
        expect(withTimeout(3_600_001)).toBe(false);
        expect(withTimeout(3_600_000)).toBe(true);
    });
});
