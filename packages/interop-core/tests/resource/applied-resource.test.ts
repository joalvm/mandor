import { describe, expect, it } from 'vitest';

import type { AppliedResource } from '../../src/resource/applied-resource.js';

describe('what applying said about a planned resource', () => {
    it('names the resource and says the write held', () => {
        const applied: AppliedResource = {
            place: 'item',
            route: 'pedidos/pedido-creado',
            ok: true,
        };

        expect(applied.ok).toBe(true);
        expect(applied.reason).toBeUndefined();
    });

    it('carries the reason when the write did not land', () => {
        const applied: AppliedResource = {
            place: 'connection',
            route: 'produccion',
            ok: false,
            reason: 'the url is not a url the transport dials',
        };

        expect(applied.ok).toBe(false);
        expect(applied.reason).toBe('the url is not a url the transport dials');
    });
});
