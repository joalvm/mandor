import { describe, expect, it } from 'vitest';

import { fingerprintOf } from '../../src/plan/fingerprint-of.js';
import { workspaceFingerprint } from '../../src/resource/workspace-fingerprint.js';

const AUTH = { type: 'bearer', token: '{{token}}' };
const SCRIPT = { event: 'onBeforeRequest', dialect: 'postman', source: 'a()' };

describe('workspaceFingerprint', () => {
    it('is what the hash of the auth alone gave before scripts existed', () => {
        expect(workspaceFingerprint({ auth: AUTH })).toBe(fingerprintOf({ auth: AUTH }));
    });

    it('treats an empty list of scripts as no scripts at all', () => {
        expect(workspaceFingerprint({ auth: AUTH, importedScripts: [] })).toBe(
            workspaceFingerprint({ auth: AUTH }),
        );
    });

    it('changes when a script comes in', () => {
        expect(workspaceFingerprint({ auth: AUTH, importedScripts: [SCRIPT] })).not.toBe(
            workspaceFingerprint({ auth: AUTH }),
        );
    });

    it('ignores the variables the workspace holds', () => {
        const fields = { auth: AUTH, variables: [{ name: 'host' }] };

        expect(workspaceFingerprint(fields)).toBe(workspaceFingerprint({ auth: AUTH }));
    });
});
