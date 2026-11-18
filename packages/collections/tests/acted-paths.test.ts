import { describe, expect, it } from 'vitest';

import { actedPaths } from '../src/lib/acted-paths.js';

const TAKEN = ['pedidos/pedido-creado', 'envios/envio-creado'];

describe('what a gesture on one row acts on (actedPaths)', () => {
    it('acts on everything taken when the row is one of them', () => {
        expect(actedPaths(TAKEN, 'envios/envio-creado')).toEqual(TAKEN);
    });

    /** Taking some rows and then pointing at another is not asking about the ones taken. */
    it('acts on the row alone when it is not among the ones taken', () => {
        expect(actedPaths(TAKEN, 'pedidos')).toEqual(['pedidos']);
    });

    it('acts on the row alone when nothing is taken', () => {
        expect(actedPaths([], 'pedidos')).toEqual(['pedidos']);
    });
});
