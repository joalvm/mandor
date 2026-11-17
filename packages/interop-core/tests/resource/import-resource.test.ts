import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import type { ImportResource } from '../../src/resource/import-resource.js';

describe('one thing an import knows how to write', () => {
    it('carries its body verbatim, its origin and what it lost on the way', () => {
        const resource: ImportResource = {
            place: 'item',
            itemKind: 'message',
            route: 'pedidos/pedido-creado',
            name: 'pedido creado',
            fields: {
                kind: 'message',
                name: 'pedido creado',
                channel: 'pedidos.creado',
                payload: '{"id":"{{pedidoId}}"}',
                payloadType: 'json',
                origin: { kind: 'asyncapi', sourceId: 'pasarela@1' },
            },
            origin: { kind: 'asyncapi', sourceId: 'pasarela@1' },
            degradations: [degradation('pkceAlways')],
        };

        expect(resource.fields['channel']).toBe('pedidos.creado');
        expect(resource.degradations).toHaveLength(1);
    });
});
