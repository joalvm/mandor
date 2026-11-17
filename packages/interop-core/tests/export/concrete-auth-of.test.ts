import { describe, expect, it } from 'vitest';

import { concreteAuthOf } from '../../src/export/concrete-auth-of.js';

describe('concreteAuthOf', () => {
    it('gives the auth a level speaks for itself', () => {
        expect(concreteAuthOf({ type: 'bearer', token: '{{token}}' })).toEqual({
            type: 'bearer',
            token: '{{token}}',
        });
    });

    it('defers when the level says nothing or says to inherit', () => {
        expect(concreteAuthOf(undefined)).toBeUndefined();
        expect(concreteAuthOf({ inherit: true })).toBeUndefined();
    });
});
