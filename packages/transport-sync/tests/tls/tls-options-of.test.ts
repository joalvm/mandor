import { describe, expect, it } from 'vitest';

import { tlsOptionsOf } from '../../src/tls/tls-options-of.js';

describe('tlsOptionsOf', () => {
    it('carries verify as rejectUnauthorized and always offers h2', () => {
        const options = tlsOptionsOf({ verify: false });

        expect(options.rejectUnauthorized).toBe(false);
        expect(options.ALPNProtocols).toEqual(['h2', 'http/1.1']);
    });

    it('offers by ALPN only what the HTTP version lets the server pick', () => {
        expect(tlsOptionsOf({ verify: true }, 'http1').ALPNProtocols).toEqual(['http/1.1']);
        expect(tlsOptionsOf({ verify: true }, 'http2').ALPNProtocols).toEqual(['h2']);
    });

    it('carries a private CA when the request names one', () => {
        const options = tlsOptionsOf({ verify: true, ca: '-----BEGIN CERTIFICATE-----' });

        expect(options.rejectUnauthorized).toBe(true);
        expect(options.ca).toBe('-----BEGIN CERTIFICATE-----');
    });

    it('carries a client certificate with its key and passphrase', () => {
        const options = tlsOptionsOf({
            verify: true,
            clientCert: { cert: 'CERT', key: 'KEY', passphrase: 'secret' },
        });

        expect(options.cert).toBe('CERT');
        expect(options.key).toBe('KEY');
        expect(options.passphrase).toBe('secret');
    });

    /** Node reads a PKCS#12 bundle from a Buffer; the request carries the bytes it was read as. */
    it('carries a PKCS#12 bundle as the Buffer node reads, with its passphrase', () => {
        const options = tlsOptionsOf({
            verify: true,
            clientCert: { pfx: new Uint8Array([1, 2, 3]), passphrase: 'secret' },
        });

        expect(Buffer.isBuffer(options.pfx)).toBe(true);
        expect([...(options.pfx ?? [])]).toEqual([1, 2, 3]);
        expect(options.passphrase).toBe('secret');
        expect(options.cert).toBeUndefined();
    });

    it('carries the bounds of the version and the cipher suites the request names', () => {
        const options = tlsOptionsOf({
            verify: true,
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            ciphers: 'TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256',
        });

        expect(options.minVersion).toBe('TLSv1.2');
        expect(options.maxVersion).toBe('TLSv1.3');
        expect(options.ciphers).toBe('TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256');
    });

    /** An empty list would offer no suite at all: empty is the runtime's own. */
    it('leaves the runtime its bounds and suites when the request names none', () => {
        const options = tlsOptionsOf({ verify: true, ciphers: '' });

        expect(options).not.toHaveProperty('minVersion');
        expect(options).not.toHaveProperty('maxVersion');
        expect(options).not.toHaveProperty('ciphers');
    });

    it('leaves the client material out when the request has none', () => {
        const options = tlsOptionsOf({ verify: true });

        expect(options.cert).toBeUndefined();
        expect(options.key).toBeUndefined();
        expect(options.passphrase).toBeUndefined();
        expect(options.ca).toBeUndefined();
    });
});
