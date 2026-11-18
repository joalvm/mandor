import { describe, expect, it } from 'vitest';

import { authOf } from '../../src/curl/curl-auth.js';
import type { CurlArg } from '../../src/curl/curl-args.js';

function user(value: string): CurlArg {
    return { name: 'user', flag: '-u', value };
}

function bearer(value: string): CurlArg {
    return { name: 'oauth2-bearer', flag: '--oauth2-bearer', value };
}

describe('the auth of a curl command', () => {
    it('has none when the command names no user', () => {
        expect(authOf([])).toBeUndefined();
    });

    it('splits at the first colon and keeps a password that is a placeholder', () => {
        expect(authOf([user('ana:{{password}}')])).toEqual({
            type: 'basic',
            username: 'ana',
            password: '{{password}}',
        });
        expect(authOf([user('ana:a:b{{x}}')])).toEqual({
            type: 'basic',
            username: 'ana',
            password: 'a:b{{x}}',
        });
    });

    it('keeps a password written out, as it came', () => {
        expect(authOf([user('ana:hunter2')])).toEqual({
            type: 'basic',
            username: 'ana',
            password: 'hunter2',
        });
    });

    it('has an empty password when there is none', () => {
        expect(authOf([user('ana')])).toEqual({ type: 'basic', username: 'ana', password: '' });
    });

    it('keeps the last user named', () => {
        expect(authOf([user('a:p'), user('b:p')])).toMatchObject({ username: 'b' });
    });

    it('reads the bearer of --oauth2-bearer', () => {
        expect(authOf([bearer('abc')])).toEqual({ type: 'bearer', token: 'abc' });
    });

    it('takes the user of the URL when no option names one', () => {
        const urlUser = { username: 'ana', password: 'p' };

        expect(authOf([], urlUser)).toEqual({ type: 'basic', ...urlUser });
        expect(authOf([bearer('abc')], urlUser)).toEqual({ type: 'bearer', token: 'abc' });
        expect(authOf([user('bob:x'), bearer('abc')], urlUser)).toMatchObject({ username: 'bob' });
    });
});
