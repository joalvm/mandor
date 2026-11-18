import { describe, expect, it } from 'vitest';

import { ELECTRON_FUSES } from '../../src/fuses/electron-fuses.js';

describe('the electron fuses', () => {
    it('shuts every door that turns the binary into a node runtime', () => {
        expect(ELECTRON_FUSES.runAsNode).toBe(false);
        expect(ELECTRON_FUSES.enableNodeOptionsEnvironmentVariable).toBe(false);
        expect(ELECTRON_FUSES.enableNodeCliInspectArguments).toBe(false);
    });

    it('refuses to load an app from anywhere but the signed asar', () => {
        expect(ELECTRON_FUSES.onlyLoadAppFromAsar).toBe(true);
        expect(ELECTRON_FUSES.enableEmbeddedAsarIntegrityValidation).toBe(true);
    });

    it('encrypts the cookies and grants the file protocol nothing extra', () => {
        expect(ELECTRON_FUSES.enableCookieEncryption).toBe(true);
        expect(ELECTRON_FUSES.grantFileProtocolExtraPrivileges).toBe(false);
    });
});
