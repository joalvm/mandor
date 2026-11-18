import { describe, expect, it } from 'vitest';

import { wireSettingsOf } from '../../../../src/main/request/wire-settings.js';

describe('the settings of a send as the transport takes them', () => {
    it('fill what the request left out with the defaults', () => {
        expect(wireSettingsOf({})).toEqual({
            cookieJar: true,
            httpVersion: 'auto',
            maxResponseBytes: 50 * 1024 * 1024,
            redirects: { follow: true, keepMethod: false, keepAuthorization: false, max: 5 },
            timeouts: { connectMs: 10_000, totalMs: 30_000 },
            tls: { verify: true },
        });
    });

    it('never wait longer to connect than the whole send may take', () => {
        const wire = wireSettingsOf({ timeoutMs: 1500, validateTls: false });

        expect(wire.timeouts).toEqual({ connectMs: 1500, totalMs: 1500 });
        expect(wire.tls.verify).toBe(false);
    });

    it('carries the authorization across origins, the limit and the handshake the request names', () => {
        const wire = wireSettingsOf({
            followAuthorizationOnRedirect: true,
            maxResponseSizeMiB: 2,
            tlsMinVersion: 'TLSv1.2',
            tlsMaxVersion: 'TLSv1.3',
            tlsCiphers: ' TLS_AES_128_GCM_SHA256 ',
        });

        expect(wire.redirects.keepAuthorization).toBe(true);
        expect(wire.maxResponseBytes).toBe(2 * 1024 * 1024);
        expect(wire.tls).toEqual({
            verify: true,
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            ciphers: 'TLS_AES_128_GCM_SHA256',
        });
    });
});
