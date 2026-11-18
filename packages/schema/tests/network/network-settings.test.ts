import { describe, expect, it } from 'vitest';

import { DEFAULT_NETWORK_SETTINGS, HOST_PATTERN, networkSettingsSchema } from '../../src/index.js';
import {
    clientCertificateSchema,
    proxySettingsSchema,
} from '../../src/network/network-settings.js';

function proxy(changes: Record<string, unknown>) {
    return proxySettingsSchema.safeParse({ ...DEFAULT_NETWORK_SETTINGS.proxy, ...changes }).success;
}

describe('the network settings of the app', () => {
    /** A fresh install dials the way the rest of the machine does, and trusts nothing more. */
    it('follow the proxy of the system and add no authority by default', () => {
        expect(networkSettingsSchema.parse(DEFAULT_NETWORK_SETTINGS)).toEqual({
            proxy: { mode: 'system', url: '', bypass: [], username: '' },
            caPaths: [],
            clientCertificates: [],
        });
    });

    it('take a written proxy over HTTP or SOCKS, credentials included', () => {
        expect(proxy({ mode: 'custom', url: 'http://proxy.corp:3128' })).toBe(true);
        expect(proxy({ mode: 'custom', url: 'socks5h://user:pass@127.0.0.1:1080' })).toBe(true);
        expect(proxy({ mode: 'custom', url: 'ftp://proxy.corp' })).toBe(false);
        expect(proxy({ mode: 'custom', url: 'proxy.corp:3128' })).toBe(false);
        expect(proxy({ mode: 'custom', url: 'not a proxy' })).toBe(false);
        expect(proxy({ mode: 'pac' })).toBe(false);
    });

    it('name hosts as a name, a wildcard, a suffix or an address, with a port or not', () => {
        for (const host of [
            'localhost',
            '*.corp.example',
            '.corp.example',
            '10.0.0.1:8443',
            '[::1]',
            '*',
        ]) {
            expect(HOST_PATTERN.test(host)).toBe(true);
        }

        expect(HOST_PATTERN.test('https://api.example')).toBe(false);
        expect(HOST_PATTERN.test('two words')).toBe(false);
        expect(proxy({ bypass: ['a/b'] })).toBe(false);
    });

    it('keep a client certificate per host, the passphrase out of the file', () => {
        const certificate = {
            id: 'c1',
            host: 'api.example.com',
            certPath: 'client.crt',
            keyPath: 'client.key',
            pfxPath: '',
        };

        expect(clientCertificateSchema.parse(certificate)).toEqual(certificate);
        expect(clientCertificateSchema.safeParse({ ...certificate, id: 'a b' }).success).toBe(
            false,
        );
        expect(
            clientCertificateSchema.safeParse({ ...certificate, passphrase: 'x' }).data,
        ).not.toHaveProperty('passphrase');
    });
});
