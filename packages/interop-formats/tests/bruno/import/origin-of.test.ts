import { describe, expect, it } from 'vitest';

import { originOf } from '../../../src/bruno/import/origin-of.js';

describe('originOf', () => {
    it('says it comes from Bruno, from which collection, and what it looked like', () => {
        expect(originOf('collection:abc', 'f1')).toEqual({
            kind: 'bruno',
            sourceId: 'collection:abc',
            fingerprint: 'f1',
        });
    });
});
