import { describe, expect, it } from 'vitest';

import { topmostNodes } from '../src/lib/topmost-nodes.js';

import { TWO_FOLDERS } from './support/two-folders.js';

function pathsOf(paths: readonly string[]): string[] {
    return topmostNodes(TWO_FOLDERS, paths).map((node) => node.path);
}

describe('the nodes a gesture on many acts on (topmostNodes)', () => {
    it('answers in the order the tree stands, whatever the order they were taken in', () => {
        expect(pathsOf(['envios/envio-creado', 'pedidos/pedido-pagado'])).toEqual([
            'pedidos/pedido-pagado',
            'envios/envio-creado',
        ]);
    });

    /** A folder deleted or moved takes what it holds with it; asking again would find nothing. */
    it('leaves out what hangs from a folder that is taken as well', () => {
        expect(pathsOf(['pedidos/pedido-creado', 'pedidos'])).toEqual(['pedidos']);
    });

    it('leaves out whatever no node answers to', () => {
        expect(pathsOf(['gone'])).toEqual([]);
    });
});
