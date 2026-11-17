import { DEFAULT_NETWORK_SETTINGS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { networkReadResultSchema, networkWriteRequestSchema } from '../../src/index.js';

describe('the network settings on the wire', () => {
    /** The window learns that a password is kept, never what it is. */
    it('read as the settings and which secrets the keychain keeps, nothing more', () => {
        const state = {
            settings: DEFAULT_NETWORK_SETTINGS,
            kept: { proxyPassword: true, passphrases: ['c1'] },
        };

        expect(networkReadResultSchema.parse({ ok: true, value: state })).toEqual({
            ok: true,
            value: state,
        });
        expect(
            networkReadResultSchema.safeParse({
                ok: true,
                value: { ...state, kept: { ...state.kept, password: 'hunter2' } },
            }).success,
        ).toBe(false);
    });

    it('are written whole, and a proxy nobody dials is refused', () => {
        expect(networkWriteRequestSchema.safeParse(DEFAULT_NETWORK_SETTINGS).success).toBe(true);
        expect(
            networkWriteRequestSchema.safeParse({
                ...DEFAULT_NETWORK_SETTINGS,
                proxy: { ...DEFAULT_NETWORK_SETTINGS.proxy, url: 'gopher://old.net' },
            }).success,
        ).toBe(false);
    });
});
