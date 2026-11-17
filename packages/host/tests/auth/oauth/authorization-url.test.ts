import { describe, expect, it } from 'vitest';

import { authorizationUrlOf } from '../../../src/auth/oauth/authorization-url.js';

const BASE = {
    authorizationUrl: 'https://idp.example.com/authorize',
    clientId: 'client',
    redirectUri: 'http://127.0.0.1:5000/callback',
    state: 'the-state',
    codeChallenge: 'the-challenge',
};

describe('authorizationUrlOf', () => {
    it('carries the code flow parameters with an S256 challenge', () => {
        const url = authorizationUrlOf({ ...BASE, scope: 'read write' });

        expect(url.origin + url.pathname).toBe('https://idp.example.com/authorize');
        expect(Object.fromEntries(url.searchParams)).toEqual({
            response_type: 'code',
            client_id: 'client',
            redirect_uri: 'http://127.0.0.1:5000/callback',
            scope: 'read write',
            state: 'the-state',
            code_challenge: 'the-challenge',
            code_challenge_method: 'S256',
        });
    });

    it('leaves the scope out when the file wrote none', () => {
        expect(authorizationUrlOf(BASE).searchParams.has('scope')).toBe(false);
    });

    it('keeps the query the endpoint already had', () => {
        const url = authorizationUrlOf({
            ...BASE,
            authorizationUrl: 'https://idp.example.com/authorize?tenant=acme',
        });

        expect(url.searchParams.get('tenant')).toBe('acme');
        expect(url.searchParams.get('client_id')).toBe('client');
    });

    it('accepts http on loopback so a local provider works', () => {
        expect(
            authorizationUrlOf({ ...BASE, authorizationUrl: 'http://localhost:8080/auth' })
                .protocol,
        ).toBe('http:');
    });

    it('takes plain http, and refuses a scheme that is not http at all', () => {
        expect(
            authorizationUrlOf({ ...BASE, authorizationUrl: 'http://idp.example.com/authorize' })
                .protocol,
        ).toBe('http:');
        expect(() =>
            authorizationUrlOf({ ...BASE, authorizationUrl: 'file:///etc/passwd' }),
        ).toThrow(expect.objectContaining({ code: 'auth-token-failed' }));
    });

    it('refuses what is not a url', () => {
        expect(() => authorizationUrlOf({ ...BASE, authorizationUrl: 'nope' })).toThrow(
            expect.objectContaining({ code: 'auth-token-failed' }),
        );
    });
});
