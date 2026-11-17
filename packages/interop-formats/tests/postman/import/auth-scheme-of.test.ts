import { describe, expect, it } from 'vitest';

import { authSchemeOf, securityOf } from '../../../src/postman/import/auth-scheme-of.js';

describe('authSchemeOf', () => {
    it('inherits when nothing is written, when it is null and when it says so', () => {
        expect(authSchemeOf(undefined)).toEqual({ kind: 'inherit' });
        expect(authSchemeOf(null)).toEqual({ kind: 'inherit' });
        expect(authSchemeOf({ type: 'inherit' })).toEqual({ kind: 'inherit' });
    });

    it('is none for noauth', () => {
        expect(authSchemeOf({ type: 'noauth' })).toEqual({ kind: 'none' });
    });

    it('is a scheme with the parameters as key and value, secrets included', () => {
        const auth = {
            type: 'basic',
            basic: [
                { key: 'username', value: 'ana', type: 'string' },
                { key: 'password', value: 'hunter2' },
                { key: 'empty' },
            ],
        };

        expect(authSchemeOf(auth)).toEqual({
            kind: 'scheme',
            scheme: {
                type: 'basic',
                extras: { username: 'ana', password: 'hunter2', empty: undefined },
            },
        });
    });

    /** The older form, which exports of v2.1 still carry: one object of key and value. */
    it('is a scheme with the parameters written as one object', () => {
        const auth = { type: 'bearer', bearer: { token: 'tok', extra: 1 } };

        expect(authSchemeOf(auth)).toEqual({
            kind: 'scheme',
            scheme: { type: 'bearer', extras: { token: 'tok', extra: 1 } },
        });
    });

    it('is a scheme with no parameters when the list is missing or is not one', () => {
        expect(authSchemeOf({ type: 'digest' })).toEqual({
            kind: 'scheme',
            scheme: { type: 'digest', extras: {} },
        });
        expect(authSchemeOf({ type: 'bearer', bearer: 'x' })).toEqual({
            kind: 'scheme',
            scheme: { type: 'bearer', extras: {} },
        });
    });
});

describe('securityOf', () => {
    it('answers null for inherit and the empty list for none, with no scheme', () => {
        expect(securityOf({ kind: 'inherit' }, 'k')).toEqual({ security: null });
        expect(securityOf({ kind: 'none' }, 'k')).toEqual({ security: [] });
    });

    it('names the scheme by the key and hands it back to be declared', () => {
        const scheme = { type: 'bearer', extras: {} };

        expect(securityOf({ kind: 'scheme', scheme }, 'request:A')).toEqual({
            security: ['request:A'],
            scheme,
        });
    });
});
