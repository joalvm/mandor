import { describe, expect, it } from 'vitest';

import { itemParentOf } from '../../src/collection/item-parent.js';

describe('itemParentOf', () => {
    it.each([
        [null, null],
        ['suelto', null],
        ['pagos/alta', 'pagos'],
        ['pagos/altas/hoy/crear', 'pagos/altas/hoy'],
    ])('answers the parent of %s', (path, parent) => {
        expect(itemParentOf(path)).toBe(parent);
    });
});
