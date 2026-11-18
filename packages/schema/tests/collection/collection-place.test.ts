import { describe, expect, it } from 'vitest';

import { collectionPlace, childPath } from '../../src/collection/collection-place.js';

describe('where a collection path sits', () => {
    it('splits a nested path into its holding folder and its name', () => {
        expect(collectionPlace('pedidos/altas/creado')).toEqual({
            parent: 'pedidos/altas',
            name: 'creado',
        });
    });

    /** The top level has no folder of its own: its order lives in the root file. */
    it('gives a path at the top level an empty parent', () => {
        expect(collectionPlace('pedidos')).toEqual({ parent: '', name: 'pedidos' });
    });

    /** The path is checked before it is read, so nothing that climbs out reaches a join. */
    it('refuses a path that is not a valid id', () => {
        expect(() => collectionPlace('pedidos/../fuera')).toThrow();
        expect(() => collectionPlace('')).toThrow();
    });
});

describe('the path of a name under a folder', () => {
    it('joins the name onto its parent', () => {
        expect(childPath('pedidos/altas', 'creado')).toBe('pedidos/altas/creado');
    });

    it('leaves a name at the top level without a leading slash', () => {
        expect(childPath('', 'pedidos')).toBe('pedidos');
    });
});
