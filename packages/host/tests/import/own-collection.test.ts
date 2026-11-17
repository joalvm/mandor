import { collectionFingerprint } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { ownAuthOf, ownFingerprint } from '../../src/import/own-collection.js';

const AUTH = { type: 'bearer', token: '{{token}}' } as const;

describe('ownAuthOf', () => {
    it('keeps a concrete auth', () => {
        expect(ownAuthOf(AUTH)).toEqual(AUTH);
    });

    it('takes `inherit`, the default of a collection, and no auth as no auth', () => {
        expect(ownAuthOf({ inherit: true })).toBeUndefined();
        expect(ownAuthOf(undefined)).toBeUndefined();
    });
});

describe('ownFingerprint', () => {
    it('is the fingerprint of the name, the words and the concrete auth', () => {
        expect(ownFingerprint({ name: 'Demo', description: 'Notes', auth: AUTH })).toBe(
            collectionFingerprint({ name: 'Demo', description: 'Notes', auth: AUTH }),
        );
    });

    it('is the same for `inherit` as for a collection with no auth', () => {
        expect(ownFingerprint({ name: 'Demo', auth: { inherit: true } })).toBe(
            ownFingerprint({ name: 'Demo' }),
        );
    });
});
