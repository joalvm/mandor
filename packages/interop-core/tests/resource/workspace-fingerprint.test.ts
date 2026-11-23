import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import { workspaceFingerprint } from '../../src/resource/workspace-fingerprint.js';

const AUTH = { type: 'bearer', token: '{{token}}' };

describe('workspaceFingerprint', () => {
    it('is the hash of the auth alone', () => {
        expect(workspaceFingerprint({ auth: AUTH })).toBe(fingerprintOf({ auth: AUTH }));
    });

    it('changes when the auth does', () => {
        expect(workspaceFingerprint({ auth: { type: 'none' } })).not.toBe(
            workspaceFingerprint({ auth: AUTH }),
        );
    });

    it('ignores the variables the workspace holds', () => {
        const fields = { auth: AUTH, variables: [{ name: 'host' }] };

        expect(workspaceFingerprint(fields)).toBe(workspaceFingerprint({ auth: AUTH }));
    });
});
