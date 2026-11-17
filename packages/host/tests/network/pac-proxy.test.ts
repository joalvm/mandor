import { describe, expect, it } from 'vitest';

import { pacProxyOf } from '../../src/network/pac-proxy.js';
import { UnsupportedProxyError } from '../../src/network/unsupported-proxy-error.js';

describe('the proxy a PAC answer of the system names', () => {
    it('goes direct when the system says DIRECT or nothing', () => {
        expect(pacProxyOf('DIRECT')).toBeUndefined();
        expect(pacProxyOf('')).toBeUndefined();
    });

    it.each([
        ['PROXY corp.test:3128', 'http://corp.test:3128'],
        ['HTTPS corp.test:443', 'https://corp.test:443'],
        ['SOCKS corp.test:1080', 'socks4://corp.test:1080'],
        ['SOCKS4 corp.test:1080', 'socks4://corp.test:1080'],
        ['SOCKS5 corp.test:1080', 'socks5://corp.test:1080'],
        ['socks5 corp.test:1080', 'socks5://corp.test:1080'],
    ])('reads %s as %s', (answer, proxy) => {
        expect(pacProxyOf(answer)).toBe(proxy);
    });

    it('takes the first entry of the list, as the system orders them', () => {
        expect(pacProxyOf('PROXY one.test:1; PROXY two.test:2; DIRECT')).toBe('http://one.test:1');
        expect(pacProxyOf('DIRECT; PROXY two.test:2')).toBeUndefined();
    });

    /** Going direct when the network named a proxy nobody speaks would skip it in silence. */
    it('fails, and never goes direct in silence, on an entry nobody speaks', () => {
        expect(() => pacProxyOf('QUIC corp.test:443')).toThrow(UnsupportedProxyError);
        expect(() => pacProxyOf('QUIC corp.test:443')).toThrow('QUIC');
    });
});
