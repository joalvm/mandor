import { describe, expect, it } from 'vitest';

import { exampleRowId, exampleRowParts } from '../../src/lib/example-row-id.js';

describe('the id of the row of an example', () => {
    it('joins the item path and the key with a colon, which no path may hold', () => {
        expect(exampleRowId('acceso/login', 'Creado')).toBe('acceso/login:Creado');
    });

    it('splits at the first colon only, so the key may hold more of them', () => {
        expect(exampleRowParts('acceso/login:Creado')).toEqual({
            itemPath: 'acceso/login',
            key: 'Creado',
        });
        expect(exampleRowParts('acceso/login:a:b')).toEqual({
            itemPath: 'acceso/login',
            key: 'a:b',
        });
    });

    it('is nothing for the id of a node', () => {
        expect(exampleRowParts('acceso/login')).toBeNull();
    });
});
