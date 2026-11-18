import { Cookie } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import { sameSiteOf } from '../../../../src/main/cookies/same-site-of.js';

function parsed(line: string): Cookie {
    const cookie = Cookie.parse(line);

    if (cookie === undefined) {
        throw new Error(`not a cookie: ${line}`);
    }

    return cookie;
}

describe('the same-site rule of a cookie', () => {
    it.each(['Strict', 'Lax', 'None'])('reads %s as the server wrote it, in lower case', (rule) => {
        expect(sameSiteOf(parsed(`sid=abc; SameSite=${rule}`))).toBe(rule.toLowerCase());
    });

    it('reads a rule a stored jar kept in another case', () => {
        const cookie = parsed('sid=abc');

        cookie.sameSite = 'LAX';

        expect(sameSiteOf(cookie)).toBe('lax');
    });

    it('says no rule when the server set none, or set one no browser knows', () => {
        const unknown = parsed('sid=abc');

        unknown.sameSite = 'unspecified';

        expect(sameSiteOf(parsed('sid=abc'))).toBeUndefined();
        expect(sameSiteOf(unknown)).toBeUndefined();
    });
});
