import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { describe, expect, it } from 'vitest';

import { tlsOptionsOf } from '../../src/client/client-network.js';
import { proxyAgentOf } from '../../src/client/proxy-agent-of.js';

describe('the agent a socket dials through', () => {
    it('goes direct when no proxy is named', () => {
        expect(proxyAgentOf(undefined)).toBeUndefined();
    });

    it.each([
        ['http://proxy:8080', HttpsProxyAgent],
        ['https://proxy:8443', HttpsProxyAgent],
        ['socks5://proxy:1080', SocksProxyAgent],
        ['socks5h://proxy:1080', SocksProxyAgent],
        ['socks4://proxy:1080', SocksProxyAgent],
        ['socks4a://proxy:1080', SocksProxyAgent],
        ['socks://proxy:1080', SocksProxyAgent],
    ])('tunnels %s with the agent of its scheme', (url, kind) => {
        expect(proxyAgentOf({ url })).toBeInstanceOf(kind);
    });

    /** Going direct instead would skip the proxy of a network that demanded it, in silence. */
    it('refuses a scheme no agent speaks instead of going direct', () => {
        expect(() => proxyAgentOf({ url: 'ftp://proxy:21' })).toThrow(/ftp: is not supported/u);
    });
});

describe('the trust a socket dials with', () => {
    it('names only what the connection named, the bundle as a Buffer', () => {
        const options = tlsOptionsOf({ ca: 'CA', pfx: new Uint8Array([1, 2]) });

        expect(options).toEqual({ ca: 'CA', pfx: Buffer.from([1, 2]) });
        expect(Buffer.isBuffer(options.pfx)).toBe(true);
    });

    it('leaves the system store alone when nothing is named', () => {
        expect(tlsOptionsOf(undefined)).toEqual({});
    });
});
