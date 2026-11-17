import { describe, expect, it } from 'vitest';

import { siblingNames } from '../../src/lib/sibling-names.js';
import { TWO_FOLDERS } from '../support/two-folders.js';

describe('the names a new node must not repeat', () => {
    it('are the collections at the top level', () => {
        expect(siblingNames(TWO_FOLDERS, '')).toEqual(['Pedidos', 'Envios']);
    });

    it('are the children of the folder it is made in', () => {
        expect(siblingNames(TWO_FOLDERS, 'envios')).toEqual(['Envio creado', 'Envio anulado']);
    });

    it('are none under a leaf or under nothing', () => {
        expect(siblingNames(TWO_FOLDERS, 'envios/envio-creado')).toEqual([]);
        expect(siblingNames(TWO_FOLDERS, 'nada')).toEqual([]);
    });
});
