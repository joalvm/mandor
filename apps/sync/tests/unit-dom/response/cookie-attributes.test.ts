import { describe, expect, it } from 'vitest';

import { cookieAttributesOf } from '../../../src/renderer/response/lib/cookie-attributes.js';

describe('cookieAttributesOf', () => {
    it('says nothing of a cookie that set no attribute', () => {
        expect(
            cookieAttributesOf({ httpOnly: false, name: 'a', secure: false, value: '1' }),
        ).toEqual([]);
    });

    it('writes each attribute as the Set-Cookie line did', () => {
        const attributes = cookieAttributesOf({
            domain: 'api.test',
            expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
            httpOnly: true,
            name: 'sid',
            path: '/',
            sameSite: 'lax',
            secure: true,
            value: 'abc',
        });

        expect(attributes).toEqual([
            'Domain=api.test',
            'Path=/',
            'Expires=Wed, 21 Oct 2026 07:28:00 GMT',
            'SameSite=Lax',
            'Secure',
            'HttpOnly',
        ]);
    });

    it.each([
        ['strict', 'SameSite=Strict'],
        ['none', 'SameSite=None'],
    ] as const)('names the %s policy', (sameSite, text) => {
        const cookie = { httpOnly: false, name: 'a', sameSite, secure: false, value: '1' };

        expect(cookieAttributesOf(cookie)).toEqual([text]);
    });
});
