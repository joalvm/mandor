import { describe, expect, it } from 'vitest';

import {
    DEFAULT_REQUEST_SETTINGS,
    effectiveRequestSettings,
} from '../../src/request/request-settings.js';

describe('the settings of a request', () => {
    it('goes out with the defaults of the domain when it keeps nothing of its own', () => {
        expect(effectiveRequestSettings({})).toEqual(DEFAULT_REQUEST_SETTINGS);
    });

    it('lays what it decided over the defaults it follows, and only that', () => {
        const defaults = {
            ...DEFAULT_REQUEST_SETTINGS,
            timeoutMs: 5000,
            httpVersion: 'http2' as const,
        };

        expect(effectiveRequestSettings({ validateTls: false }, defaults)).toEqual({
            ...defaults,
            validateTls: false,
        });
    });

    /** What was kept comes from disk, written by another version: only the settings of a request count. */
    it('reads a setting kept empty as the default, and drops one a request does not have', () => {
        const kept = { retired: true, timeoutMs: undefined };

        expect(effectiveRequestSettings(kept)).toEqual(DEFAULT_REQUEST_SETTINGS);
    });

    /** Postman's defaults: the credentials stay home, the body stops at 50 MiB, TLS is the runtime's. */
    it('keeps the hardening of the wire at the safe end by default', () => {
        expect(DEFAULT_REQUEST_SETTINGS).toMatchObject({
            followAuthorizationOnRedirect: false,
            maxResponseSizeMiB: 50,
            tlsMinVersion: 'auto',
            tlsMaxVersion: 'auto',
            tlsCiphers: '',
        });
    });
});
