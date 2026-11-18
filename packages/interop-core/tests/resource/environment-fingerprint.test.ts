import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import { environmentFingerprint } from '../../src/resource/environment-fingerprint.js';

describe('environmentFingerprint', () => {
    it('is the hash of the name and the names of the variables', () => {
        expect(environmentFingerprint({ name: 'Prod', variables: [{ name: 'host' }] })).toBe(
            fingerprintOf({ name: 'Prod', variables: ['host'] }),
        );
    });

    it('does not move when a value changes', () => {
        const before = { name: 'Prod', variables: [{ name: 'host', value: 'a' }] };
        const after = { name: 'Prod', variables: [{ name: 'host', value: 'b' }] };

        expect(environmentFingerprint(before)).toBe(environmentFingerprint(after));
    });

    it('moves when a name is added', () => {
        const more = { name: 'Prod', variables: [{ name: 'host' }, { name: 'port' }] };

        expect(environmentFingerprint(more)).not.toBe(
            environmentFingerprint({ name: 'Prod', variables: [{ name: 'host' }] }),
        );
    });
});
