import { describe, expect, it } from 'vitest';

import { createMessageItem, FormatError } from '../../src/index.js';

describe('createMessageItem', () => {
    it('makes an empty json message out of nothing but a name', () => {
        expect(createMessageItem({ name: 'Pedido creado' })).toEqual({
            name: 'Pedido creado',
            payload: '',
            payloadType: 'json',
            schema: '',
        });
    });

    it('keeps the channel, the payload and the type given', () => {
        const message = createMessageItem({
            name: 'Pedido creado',
            channel: '{{tenant}}.pedidos.creado',
            payload: 'hola',
            payloadType: 'text',
        });

        expect(message.channel).toBe('{{tenant}}.pedidos.creado');
        expect(message.payload).toBe('hola');
        expect(message.payloadType).toBe('text');
    });

    it('keeps the description given, and leaves it out when nobody wrote one', () => {
        const described = createMessageItem({ name: 'Pedido creado', description: '# Qué manda' });

        expect(described.description).toBe('# Qué manda');
        expect(createMessageItem({ name: 'Pedido creado' }).description).toBeUndefined();
    });

    it('rejects a name that is only whitespace', () => {
        expect(() => createMessageItem({ name: '   ' })).toThrow(FormatError);
    });
});
