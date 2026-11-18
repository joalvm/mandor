import { describe, expect, it } from 'vitest';

import { AuthTokenError } from '../../../src/auth/auth-token-error.js';
import { authorizationServerOf } from '../../../src/auth/oauth/authorization-server-of.js';

describe('authorizationServerOf', () => {
    it('builds the server by hand from the endpoints, the issuer being the origin of the token url', () => {
        const { server } = authorizationServerOf({
            tokenUrl: 'https://idp.example/oauth/token',
            authorizationUrl: 'https://idp.example/oauth/authorize',
        });

        expect(server).toEqual({
            issuer: 'https://idp.example',
            token_endpoint: 'https://idp.example/oauth/token',
            authorization_endpoint: 'https://idp.example/oauth/authorize',
        });
    });

    it('leaves the authorization endpoint out when nobody gave one', () => {
        const { server } = authorizationServerOf({ tokenUrl: 'https://idp.example/token' });

        expect(server).not.toHaveProperty('authorization_endpoint');
    });

    it('does not ask for the insecure allowance on https', () => {
        expect(authorizationServerOf({ tokenUrl: 'https://idp.example/token' }).insecure).toBe(
            false,
        );
    });

    it('allows plain http, on this machine or on the network', () => {
        for (const host of ['127.0.0.1:8080', 'localhost:8080', '[::1]:8080', 'example.com']) {
            const { insecure } = authorizationServerOf({ tokenUrl: `http://${host}/token` });

            expect(insecure).toBe(true);
        }
    });

    it('asks for the allowance when only the authorization endpoint is plain http', () => {
        expect(
            authorizationServerOf({
                tokenUrl: 'https://idp.example/token',
                authorizationUrl: 'http://example.com/authorize',
            }).insecure,
        ).toBe(true);
    });

    it('refuses a scheme that is not http at all', () => {
        expect(() => authorizationServerOf({ tokenUrl: 'file:///etc/passwd' })).toThrow(
            AuthTokenError,
        );
        expect(() => authorizationServerOf({ tokenUrl: 'file:///etc/passwd' })).toThrow(
            expect.objectContaining({ code: 'auth-token-failed' }),
        );
    });

    it('fails as a token failure when the url is not a url', () => {
        expect(() => authorizationServerOf({ tokenUrl: '{{base}}/token' })).toThrow(
            expect.objectContaining({ code: 'auth-token-failed' }),
        );
    });
});
