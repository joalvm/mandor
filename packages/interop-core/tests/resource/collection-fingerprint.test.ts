import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import { collectionFingerprint } from '../../src/resource/collection-fingerprint.js';

const AUTH = { type: 'bearer', token: '{{token}}' };

describe('collectionFingerprint', () => {
    it('is what the hash of the name and the words gave before the auth was written', () => {
        expect(collectionFingerprint({ name: 'Demo', description: 'Notes' })).toBe(
            fingerprintOf({ name: 'Demo', description: 'Notes' }),
        );
        expect(collectionFingerprint({ name: 'Demo' })).toBe(fingerprintOf({ name: 'Demo' }));
    });

    it('changes when the auth comes in or changes', () => {
        const bare = collectionFingerprint({ name: 'Demo' });
        const withAuth = collectionFingerprint({ name: 'Demo', auth: AUTH });

        expect(withAuth).not.toBe(bare);
        expect(collectionFingerprint({ name: 'Demo', auth: { ...AUTH, token: 'x' } })).not.toBe(
            withAuth,
        );
    });

    it('treats an undefined description or auth as an absent one', () => {
        expect(
            collectionFingerprint({ name: 'Demo', description: undefined, auth: undefined }),
        ).toBe(collectionFingerprint({ name: 'Demo' }));
    });
});
