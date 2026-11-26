import type { CookieRow } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import {
    cookieDomainsOf,
    domainOf,
    domainsMatching,
    isOpenIn,
    newCookieLine,
} from '../../../../../src/renderer/features/cookies/lib/cookie-domains.js';

const SID: CookieRow = {
    line: 'sid=abc; Path=/',
    domain: 'api.example.com',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: null,
};

describe('the domain a typed text names', () => {
    it('reads a bare domain, a pasted URL and an old leading dot alike', () => {
        expect(domainOf('  Api.Example.com ')).toBe('api.example.com');
        expect(domainOf('https://api.example.com:8443/users?a=1')).toBe('api.example.com');
        expect(domainOf('.example.com')).toBe('example.com');
    });

    it('names none for an empty text or one no URL can hold', () => {
        expect(domainOf('   ')).toBeNull();
        expect(domainOf('a b')).toBeNull();
        expect(domainOf('file:///etc/hosts')).toBeNull();
    });
});

describe('the domains of the jar', () => {
    it('groups the cookies by domain, in the order of the names', () => {
        const other = { ...SID, domain: 'auth.example.com', name: 'token' };
        const theme = { ...SID, name: 'theme' };

        expect(cookieDomainsOf([SID, other, theme], [])).toEqual([
            { cookies: [SID, theme], domain: 'api.example.com' },
            { cookies: [other], domain: 'auth.example.com' },
        ]);
    });

    it('keeps a domain added in the dialog, empty, until a cookie is written to it', () => {
        expect(cookieDomainsOf([SID], ['new.test', 'api.example.com'])).toEqual([
            { cookies: [SID], domain: 'api.example.com' },
            { cookies: [], domain: 'new.test' },
        ]);
    });

    it('narrows to the domains that hold the text, or the host of a pasted URL', () => {
        const domains = cookieDomainsOf([SID], ['auth.test']);

        expect(domainsMatching(domains, '')).toBe(domains);
        expect(domainsMatching(domains, 'EXAMPLE').map(({ domain }) => domain)).toEqual([
            'api.example.com',
        ]);
        expect(domainsMatching(domains, 'https://auth.test/login')).toEqual([
            { cookies: [], domain: 'auth.test' },
        ]);
        expect(domainsMatching(domains, 'nothing.here')).toEqual([]);
    });
});

describe('the line open in the editor', () => {
    it('belongs to the cookie it was opened from and to no other', () => {
        const draft = { replaces: { domain: 'api.example.com', name: 'sid', path: '/' } };

        expect(isOpenIn(SID, draft)).toBe(true);
        expect(isOpenIn({ ...SID, path: '/app' }, draft)).toBe(false);
        expect(isOpenIn({ ...SID, name: 'other' }, draft)).toBe(false);
        expect(isOpenIn(SID, {})).toBe(false);
        expect(isOpenIn(SID, null)).toBe(false);
    });

    it('starts a new cookie with the first free name, at the root, kept a year', () => {
        const now = new Date('2026-11-26T10:00:00.000Z');
        const held = [
            { ...SID, name: 'Cookie_1' },
            { ...SID, name: 'Cookie_3' },
        ];

        expect(newCookieLine([], now)).toBe(
            'Cookie_1=value; Path=/; Expires=Fri, 26 Nov 2027 10:00:00 GMT',
        );
        expect(newCookieLine(held, now)).toMatch(/^Cookie_2=value; /u);
    });
});
