import { describe, expect, it } from 'vitest';

import { folderPlace, itemPlace, orderPlace } from '../../src/collection/collection-places.js';

const ROOT = 'repo';
const WORKSPACE = 'api-de-pagos';
const COLLECTION = 'workspaces/api-de-pagos/collections';

describe('where a collection node sits in the repo', () => {
    it('names the file of an item, with the extension its path leaves out', () => {
        expect(itemPlace(ROOT, WORKSPACE, 'pedidos/pedido-creado')).toBe(
            `${COLLECTION}/pedidos/pedido-creado.yaml`,
        );
    });

    it('names the directory of a folder', () => {
        expect(folderPlace(ROOT, WORKSPACE, 'pedidos')).toBe(`${COLLECTION}/pedidos`);
    });

    it('keeps the order of the top level in the root file', () => {
        expect(orderPlace(ROOT, WORKSPACE, '')).toBe(`${COLLECTION}/collections.yaml`);
    });

    it('keeps the order of a folder in the file of that folder', () => {
        expect(orderPlace(ROOT, WORKSPACE, 'pedidos')).toBe(
            `${COLLECTION}/pedidos/collection.yaml`,
        );
    });

    it('refuses a path that climbs out of the collection', () => {
        expect(() => folderPlace(ROOT, WORKSPACE, '../../fuera')).toThrow();
    });
});
