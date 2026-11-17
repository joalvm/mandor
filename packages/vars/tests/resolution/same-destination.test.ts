import { describe, expect, it } from 'vitest';

import { sameDestination } from '../../src/index.js';

const BASE = 'https://api.test/v1/users';

describe('sameDestination', () => {
    it('holds for another path, query or fragment on the same origin', () => {
        expect(sameDestination(BASE, 'https://api.test/other?x=1#y')).toBe(true);
    });

    it('folds what the parser folds: default port, case, IDN', () => {
        expect(sameDestination('http://a.com:80/x', 'http://a.com/y')).toBe(true);
        expect(sameDestination('https://api.test/x', 'https://API.TEST/y')).toBe(true);
        expect(sameDestination('https://bücher.test/', 'https://xn--bcher-kva.test/')).toBe(true);
    });

    it('tells apart another scheme, port or host', () => {
        expect(sameDestination(BASE, 'http://api.test/v1/users')).toBe(false);
        expect(sameDestination(BASE, 'https://api.test:8443/v1/users')).toBe(false);
        expect(sameDestination(BASE, 'https://evil.test/v1/users')).toBe(false);
    });

    it('takes a trailing dot as another host, as the runtime does', () => {
        expect(sameDestination('https://A.com./', 'https://a.com/')).toBe(false);
        expect(sameDestination('https://A.com./', 'https://a.com./')).toBe(true);
    });

    it('reads the host where the parser reads it, not where a person would', () => {
        expect(sameDestination(BASE, 'https://evil.test@api.test/')).toBe(true);
        expect(sameDestination(BASE, 'https://api.test@evil.test/')).toBe(false);
        expect(sameDestination(BASE, 'https://api.test\\@evil.test/')).toBe(true);
        expect(sameDestination(BASE, 'https:\\\\evil.test/')).toBe(false);
        expect(sameDestination(BASE, 'https://api.te\tst/')).toBe(true);
        expect(sameDestination(BASE, 'https://api.test\n.evil/')).toBe(false);
    });

    it('matches nothing for a text that is no URL, a relative one, or an opaque origin', () => {
        expect(sameDestination('not a url', 'not a url')).toBe(false);
        expect(sameDestination('//evil.test/x', '//evil.test/x')).toBe(false);
        expect(sameDestination(BASE, '//evil.test/x')).toBe(false);
        expect(sameDestination('data:text/plain,a', 'data:text/plain,a')).toBe(false);
        expect(sameDestination(BASE, 'not a url')).toBe(false);
    });
});
