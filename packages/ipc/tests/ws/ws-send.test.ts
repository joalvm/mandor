import { describe, expect, it } from 'vitest';

import { wsSendRequestSchema } from '../../src/index.js';

describe('ws:send payload', () => {
    /** The renderer never resolves: what travels is the template and where to resolve it. */
    it('accepts a template with the workspace it belongs to', () => {
        const request = {
            connectionId: 'gateway',
            workspaceId: 'payments',
            template: '{ "id": "{{pedidoId}}" }',
            origin: 'Pedido creado',
            itemPath: 'pedidos/creado',
        };

        expect(wsSendRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts a frame nobody wrote in the collection', () => {
        const parsed = wsSendRequestSchema.parse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            template: 'hola',
            origin: null,
            itemPath: null,
        });

        expect(parsed.origin).toBeNull();
    });

    /** Resolved text from the renderer would put a secret where main never chose to. */
    it('rejects a payload that carries resolved data instead of a template', () => {
        const result = wsSendRequestSchema.safeParse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            data: 'hola',
            origin: null,
        });

        expect(result.success).toBe(false);
    });
});
