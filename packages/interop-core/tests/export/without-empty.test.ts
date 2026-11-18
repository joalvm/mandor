import { describe, expect, it } from 'vitest';

import { withoutEmpty } from '../../src/export/without-empty.js';

describe('withoutEmpty', () => {
    it('drops the fields left unset or empty and keeps the rest', () => {
        expect(withoutEmpty({ a: 'x', b: undefined, c: '', d: false, e: true })).toEqual({
            a: 'x',
            d: false,
            e: true,
        });
    });
});
