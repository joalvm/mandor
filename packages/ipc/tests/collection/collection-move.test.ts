import { describe, expect, it } from 'vitest';

import { collectionMoveRequestSchema } from '../../src/collection/collection-move.js';

describe('collectionMoveRequestSchema', () => {
    const move = {
        workspaceId: 'api-pagos',
        from: 'pedidos/crear',
        to: 'archivo/crear',
        kind: 'item',
    };

    it('accepts a node that goes from one path to another, above a sibling', () => {
        const request = { ...move, before: 'cancelar' };

        expect(collectionMoveRequestSchema.parse(request)).toEqual(request);
    });

    it('sends the node to the end of the order when it names no sibling', () => {
        expect(collectionMoveRequestSchema.parse(move).before).toBeNull();
    });

    it.each(['collection', 'folder', 'item'])('accepts a %s as what travels', (kind) => {
        expect(collectionMoveRequestSchema.safeParse({ ...move, kind }).success).toBe(true);
    });

    it('refuses a kind that is not one of the three', () => {
        expect(collectionMoveRequestSchema.safeParse({ ...move, kind: 'doc' }).success).toBe(false);
    });

    it('refuses a path made of anything but id segments, on either end', () => {
        expect(collectionMoveRequestSchema.safeParse({ ...move, from: '../fuera' }).success).toBe(
            false,
        );
        expect(collectionMoveRequestSchema.safeParse({ ...move, to: 'a//b' }).success).toBe(false);
    });
});
