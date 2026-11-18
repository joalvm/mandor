import { describe, expect, it } from 'vitest';

import { hostMatches } from '../../src/network/host-matches.js';

function matches(pattern: string, url: string): boolean {
    return hostMatches(pattern, new URL(url));
}

describe('the hosts a pattern of the settings names', () => {
    it('names every host with a star', () => {
        expect(matches('*', 'https://anything.test/x')).toBe(true);
    });

    it('names one host alone, whatever its case', () => {
        expect(matches('API.test', 'https://api.test')).toBe(true);
        expect(matches('api.test', 'https://v2.api.test')).toBe(false);
    });

    it('names the hosts under a domain, and not the domain, with `*.`', () => {
        expect(matches('*.corp.test', 'https://a.corp.test')).toBe(true);
        expect(matches('*.corp.test', 'https://corp.test')).toBe(false);
    });

    it('names a domain and the hosts under it with a leading dot', () => {
        expect(matches('.corp.test', 'https://corp.test')).toBe(true);
        expect(matches('.corp.test', 'https://a.b.corp.test')).toBe(true);
        expect(matches('.corp.test', 'https://notcorp.test')).toBe(false);
    });

    it('holds the port when the pattern names one', () => {
        expect(matches('api.test:8443', 'https://api.test:8443')).toBe(true);
        expect(matches('api.test:8443', 'https://api.test:9000')).toBe(false);
    });

    /** `api.test:443` is what `https://api.test` dials, though the url writes no port. */
    it.each([
        ['api.test:443', 'https://api.test'],
        ['api.test:443', 'wss://api.test'],
        ['api.test:80', 'http://api.test'],
        ['api.test:80', 'ws://api.test'],
    ])('counts the default port of the scheme: %s against %s', (pattern, url) => {
        expect(matches(pattern, url)).toBe(true);
    });

    it('reads an IPv6 address with its brackets and its port', () => {
        expect(matches('[::1]', 'http://[::1]:3000')).toBe(true);
        expect(matches('[::1]:3000', 'http://[::1]:3000')).toBe(true);
        expect(matches('[::1]:4000', 'http://[::1]:3000')).toBe(false);
    });

    it('ignores the blanks around a pattern', () => {
        expect(matches('  api.test ', 'https://api.test')).toBe(true);
    });
});
