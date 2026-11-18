import { describe, expect, it } from 'vitest';

import { environmentProxyOf } from '../../src/network/environment-proxy.js';

function proxyOf(env: Record<string, string>, url: string): string | undefined {
    return environmentProxyOf(env, new URL(url));
}

describe('the proxy the environment of the process names', () => {
    it('goes direct when nothing is set', () => {
        expect(proxyOf({}, 'https://api.test')).toBeUndefined();
    });

    it('takes HTTPS_PROXY for a secure url and HTTP_PROXY for the rest', () => {
        const env = { HTTPS_PROXY: 'http://secure.test:1', HTTP_PROXY: 'http://plain.test:2' };

        expect(proxyOf(env, 'https://api.test')).toBe('http://secure.test:1');
        expect(proxyOf(env, 'wss://api.test')).toBe('http://secure.test:1');
        expect(proxyOf(env, 'http://api.test')).toBe('http://plain.test:2');
        expect(proxyOf(env, 'ws://api.test')).toBe('http://plain.test:2');
    });

    /** curl reads the lower-case spelling first; a shell that sets both means the lower one. */
    it('prefers the lower-case spelling', () => {
        const env = { http_proxy: 'http://lower.test', HTTP_PROXY: 'http://upper.test' };

        expect(proxyOf(env, 'http://api.test')).toBe('http://lower.test');
    });

    it('falls back on ALL_PROXY when the scheme has no variable', () => {
        expect(proxyOf({ ALL_PROXY: 'socks5://all.test:1080' }, 'https://api.test')).toBe(
            'socks5://all.test:1080',
        );
    });

    it('reads a value without a scheme as an http proxy', () => {
        expect(proxyOf({ HTTP_PROXY: 'corp.test:3128' }, 'http://api.test')).toBe(
            'http://corp.test:3128',
        );
    });

    it('treats a blank variable as unset', () => {
        expect(proxyOf({ HTTP_PROXY: '  ' }, 'http://api.test')).toBeUndefined();
    });

    it('goes direct to every host when NO_PROXY is a star', () => {
        const env = { HTTP_PROXY: 'corp.test:1', NO_PROXY: '*' };

        expect(proxyOf(env, 'http://api.test')).toBeUndefined();
    });

    /** `corp.test`, `.corp.test` and `*.corp.test` all cover the domain and what is under it. */
    it.each(['corp.test', '.corp.test', '*.corp.test'])(
        'leaves out a domain and the hosts under it for the entry %s',
        (entry) => {
            const env = { HTTP_PROXY: 'proxy.test:1', no_proxy: `other.test, ${entry}` };

            expect(proxyOf(env, 'http://corp.test')).toBeUndefined();
            expect(proxyOf(env, 'http://a.corp.test')).toBeUndefined();
            expect(proxyOf(env, 'http://notcorp.test')).toBe('http://proxy.test:1');
        },
    );

    it('leaves out a host only on the port its entry names', () => {
        const env = { HTTP_PROXY: 'proxy.test:1', NO_PROXY: 'api.test:8080' };

        expect(proxyOf(env, 'http://api.test:8080')).toBeUndefined();
        expect(proxyOf(env, 'http://api.test')).toBe('http://proxy.test:1');
    });
});
