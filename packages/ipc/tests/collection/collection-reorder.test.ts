import { describe, expect, it } from 'vitest';

import { collectionReorderRequestSchema } from '../../src/collection/collection-reorder.js';

describe('collectionReorderRequestSchema', () => {
    it('names the folder that holds the siblings and the one the node lands above', () => {
        const request = {
            workspaceId: 'api-pagos',
            parent: 'pedidos',
            name: 'crear',
            before: 'cancelar',
        };

        expect(collectionReorderRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts the top level, which has no path of its own, as the parent', () => {
        const request = { workspaceId: 'api-pagos', parent: '', name: 'pedidos', before: null };

        expect(collectionReorderRequestSchema.parse(request)).toEqual(request);
    });

    it('does not default the sibling: sending to the end has to be said', () => {
        const result = collectionReorderRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            parent: '',
            name: 'pedidos',
        });

        expect(result.success).toBe(false);
    });

    it('refuses a parent that is not made of id segments', () => {
        const result = collectionReorderRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            parent: 'a//b',
            name: 'crear',
            before: null,
        });

        expect(result.success).toBe(false);
    });

    it('refuses a name that is not an id', () => {
        const result = collectionReorderRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            parent: '',
            name: 'Crear Pedido',
            before: null,
        });

        expect(result.success).toBe(false);
    });
});
