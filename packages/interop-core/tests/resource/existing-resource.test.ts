import { describe, expect, it } from 'vitest';

import type { ExistingResource } from '../../src/resource/existing-resource.js';

describe('what the workspace already holds', () => {
    it('says where the resource is and who wrote it', () => {
        const existing: ExistingResource = {
            place: 'item',
            route: 'pedidos/pedido-creado',
            name: 'pedido creado',
            origin: { kind: 'asyncapi', sourceId: 'pasarela@1' },
        };

        expect(existing.origin?.sourceId).toBe('pasarela@1');
    });

    it('holds a resource without origin, because a person may have written it', () => {
        const existing: ExistingResource = {
            place: 'item',
            route: 'pedidos/hecho-a-mano',
            name: 'hecho a mano',
        };

        expect(existing.origin).toBeUndefined();
    });
});
