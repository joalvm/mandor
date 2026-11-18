import { describe, expect, it } from 'vitest';

import { importResourceSchema } from '../../src/resource/import-resource-schema.js';

const resource = {
    place: 'item',
    itemKind: 'message',
    route: 'pedidos/pedido-creado',
    name: 'pedido creado',
    fields: { kind: 'message', name: 'pedido creado' },
    origin: { kind: 'asyncapi', sourceId: 'pasarela@1' },
    degradations: [],
};

describe('parsing a resource of an import', () => {
    it('reads a resource with its place, route, body, origin and degradations', () => {
        const parsed = importResourceSchema.parse(resource);

        expect(parsed.place).toBe('item');
        expect(parsed.origin).toEqual({ kind: 'asyncapi', sourceId: 'pasarela@1' });
    });

    it('refuses an empty route, because a resource without a route lands nowhere', () => {
        expect(importResourceSchema.safeParse({ ...resource, route: '' }).success).toBe(false);
    });

    it('refuses a place that is not one the workspace holds', () => {
        expect(importResourceSchema.safeParse({ ...resource, place: 'doc' }).success).toBe(false);
    });

    it('refuses a degradation line that says nothing', () => {
        expect(importResourceSchema.safeParse({ ...resource, degradations: ['   '] }).success).toBe(
            false,
        );
    });

    it('refuses an item that does not say which kind of item it writes', () => {
        expect(importResourceSchema.safeParse({ ...resource, itemKind: null }).success).toBe(false);
    });

    it('refuses a place other than an item that names an item kind', () => {
        expect(importResourceSchema.safeParse({ ...resource, place: 'folder' }).success).toBe(
            false,
        );
    });

    it('reads an environment, which names no item kind', () => {
        expect(
            importResourceSchema.safeParse({ ...resource, place: 'environment', itemKind: null })
                .success,
        ).toBe(true);
    });
});
