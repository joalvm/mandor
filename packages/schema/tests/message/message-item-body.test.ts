import { describe, expect, it } from 'vitest';

import { createMessageItem } from '../../src/index.js';
import { messageItemBody } from '../../src/message/message-item-body.js';

describe('messageItemBody', () => {
    it('writes the keys of the kind flat, with no wrapper of its own', () => {
        const message = createMessageItem({
            name: 'Pedido creado',
            channel: 'pedidos.creado',
            payload: '{"id":1}',
            description: '# Qué manda',
        });

        expect(messageItemBody(message)).toEqual({
            channel: 'pedidos.creado',
            payload: '{"id":1}',
            payloadType: 'json',
            description: '# Qué manda',
        });
    });

    it('leaves out the channel nobody named, the payload nobody wrote and the schema nobody wrote', () => {
        expect(messageItemBody(createMessageItem({ name: 'Pedido creado' }))).toEqual({
            payloadType: 'json',
        });
    });

    it('keeps the schema the message carries, and takes it off when emptied', () => {
        const shaped = createMessageItem({
            name: 'Pedido creado',
            schema: '{"type": "object"}',
        });

        expect(messageItemBody(shaped)['schema']).toBe('{"type": "object"}');
        expect(messageItemBody({ ...shaped, schema: '' })['schema']).toBeUndefined();
    });

    /**
     * The body is what the message says about itself, whole. A key it names with nothing behind
     * it is how the writer is told the field is gone; leaving the key out would mean «do not
     * touch it», and the value somebody just erased would stay on disk.
     */
    it('names every key it owns, so an emptied field comes out of the file', () => {
        const body = messageItemBody(createMessageItem({ name: 'Pedido creado' }));

        expect(Object.keys(body)).toEqual([
            'channel',
            'payload',
            'payloadType',
            'schema',
            'description',
        ]);
        expect(body['channel']).toBeUndefined();
        expect(body['payload']).toBeUndefined();
    });
});
