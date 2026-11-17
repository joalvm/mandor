import { describe, expect, it } from 'vitest';

import { withCookieHeader } from '../../src/cookie/with-cookie-header.js';

describe('withCookieHeader', () => {
    it('leaves the headers as they are when the jar has nothing', () => {
        const headers = [['Accept', '*/*']] as const;

        expect(withCookieHeader(headers, null)).toBe(headers);
        expect(withCookieHeader(headers, '')).toBe(headers);
    });

    it('adds a Cookie when there was none', () => {
        expect(withCookieHeader([['Accept', '*/*']], 'sid=abc')).toEqual([
            ['Accept', '*/*'],
            ['Cookie', 'sid=abc'],
        ]);
    });

    it('puts the jar after the cookie written by hand, in one header', () => {
        expect(
            withCookieHeader(
                [
                    ['cookie', 'mine=1'],
                    ['Accept', '*/*'],
                ],
                'sid=abc',
            ),
        ).toEqual([
            ['Accept', '*/*'],
            ['Cookie', 'mine=1; sid=abc'],
        ]);
    });
});
