import { describe, expect, it } from 'vitest';

import { FormatError, parseCollectionItem, parseMessageItem } from '../../src/index.js';

const item = parseCollectionItem({
    kind: 'message',
    name: 'Pedido creado',
    channel: 'pedidos.creado',
    payload: '{"id":"{{pedidoId}}"}',
    payloadType: 'json',
    description: '# Qué manda',
});

describe('parseMessageItem', () => {
    it('reads the keys of the kind that sit beside the envelope', () => {
        expect(parseMessageItem(item)).toEqual({
            name: 'Pedido creado',
            channel: 'pedidos.creado',
            payload: '{"id":"{{pedidoId}}"}',
            payloadType: 'json',
            description: '# Qué manda',
            schema: '',
        });
    });

    it('reads an item that only has its envelope as an empty json message', () => {
        const fresh = parseCollectionItem({ kind: 'message', name: 'Pedido creado' });

        expect(parseMessageItem(fresh)).toEqual({
            name: 'Pedido creado',
            payload: '',
            payloadType: 'json',
            schema: '',
        });
    });

    it('keeps a channel written as a template', () => {
        const scoped = parseCollectionItem({ ...item, channel: '{{tenant}}.pedidos.creado' });

        expect(parseMessageItem(scoped).channel).toBe('{{tenant}}.pedidos.creado');
    });

    it('keeps the schema text the message carries', () => {
        const shaped = parseCollectionItem({
            ...item,
            schema: '{"type": "object", "required": ["id"]}',
        });

        expect(parseMessageItem(shaped).schema).toBe('{"type": "object", "required": ["id"]}');
    });

    /**
     * Messages written before schemas existed carry none and keep reading: absence is the
     * state of every message that never wrote one, not a file to migrate.
     */
    it('reads a message that predates schema texts without a migration', () => {
        expect(parseMessageItem(item).schema).toBe('');
    });

    it('rejects a payload type that is not one of the three', () => {
        const wrong = parseCollectionItem({ ...item, payloadType: 'xml' });

        expect(() => parseMessageItem(wrong)).toThrow(FormatError);
    });

    it('rejects a channel that is written but blank', () => {
        const blank = parseCollectionItem({ ...item, channel: '   ' });

        expect(() => parseMessageItem(blank)).toThrow(FormatError);
    });

    it('drops the keys of another app instead of failing on them', () => {
        const foreign = parseCollectionItem({ ...item, retries: 3 });

        expect(parseMessageItem(foreign)).not.toHaveProperty('retries');
    });
});
