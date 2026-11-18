import { describe, expect, it } from 'vitest';

import { collectionItemEnvelopeSchema } from '../../src/collection/collection-item-envelope-schema.js';

describe('collectionItemEnvelopeSchema', () => {
    it('reads the keys the tree needs to draw a row', () => {
        const envelope = {
            kind: 'request',
            name: 'Crear pedido',
            tags: ['pagos'],
            origin: { kind: 'postman', sourceId: 'abc' },
        };

        expect(collectionItemEnvelopeSchema.parse(envelope)).toEqual(envelope);
    });

    it('lets tags and origin be absent: a person wrote it', () => {
        expect(collectionItemEnvelopeSchema.parse({ kind: 'message', name: 'Hola' })).toEqual({
            kind: 'message',
            name: 'Hola',
        });
    });

    it('lets the keys of the kind travel through untouched', () => {
        const parsed = collectionItemEnvelopeSchema.parse({
            kind: 'request',
            name: 'Crear',
            method: 'POST',
            url: '{{host}}/pedidos',
        });

        expect(parsed).toMatchObject({ method: 'POST', url: '{{host}}/pedidos' });
    });

    it('refuses a kind that is not an id', () => {
        expect(collectionItemEnvelopeSchema.safeParse({ kind: 'My Kind', name: 'x' }).success).toBe(
            false,
        );
    });

    it('refuses a name made of whitespace only, and a tag too', () => {
        expect(collectionItemEnvelopeSchema.safeParse({ kind: 'request', name: ' ' }).success).toBe(
            false,
        );
        expect(
            collectionItemEnvelopeSchema.safeParse({ kind: 'request', name: 'x', tags: [' '] })
                .success,
        ).toBe(false);
    });

    it('refuses an origin that names no importer the collection knows', () => {
        const origin = { kind: 'manual', sourceId: 'abc' };

        expect(
            collectionItemEnvelopeSchema.safeParse({ kind: 'request', name: 'x', origin }).success,
        ).toBe(false);
    });
});
