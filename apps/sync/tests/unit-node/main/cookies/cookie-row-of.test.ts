import { Cookie } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import { cookieRowOf } from '../../../../src/main/cookies/cookie-row-of.js';

function parsed(line: string): Cookie {
    const cookie = Cookie.parse(line);

    if (cookie === undefined) {
        throw new Error(`not a cookie: ${line}`);
    }

    cookie.domain = 'api.example.com';

    return cookie;
}

describe('a cookie as the window sees it', () => {
    it('says no end for a cookie of the session', () => {
        expect(cookieRowOf(parsed('sid=abc; Path=/')).expires).toBeNull();
    });

    it('says the end a cookie with Expires has', () => {
        const row = cookieRowOf(parsed('sid=abc; Expires=Wed, 21 Oct 2037 07:28:00 GMT'));

        expect(row.expires).toBe('2037-10-21T07:28:00.000Z');
    });

    it('says the end Max-Age gives, counted from the moment the jar took it', () => {
        const cookie = parsed('sid=abc; Max-Age=60');
        const before = Date.now();
        const end = Date.parse(cookieRowOf(cookie).expires ?? '');

        expect(end).toBeGreaterThanOrEqual(before);
        expect(end).toBeLessThanOrEqual(Date.now() + 60_000);
    });

    it.each(['Strict', 'Lax', 'None'])('says the same-site rule %s in lower case', (rule) => {
        expect(cookieRowOf(parsed(`sid=abc; SameSite=${rule}`)).sameSite).toBe(rule.toLowerCase());
    });

    it('says no same-site rule when the server set none', () => {
        expect(cookieRowOf(parsed('sid=abc')).sameSite).toBeNull();
    });

    it('carries the flags and the identity', () => {
        expect(cookieRowOf(parsed('sid=abc; Path=/api; Secure; HttpOnly'))).toMatchObject({
            domain: 'api.example.com',
            path: '/api',
            name: 'sid',
            value: 'abc',
            secure: true,
            httpOnly: true,
        });
    });
});
