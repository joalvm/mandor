import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authOf } from '../../../src/insomnia/import/auth-of.js';

describe('authOf: oauth2', () => {
    it('keeps the client credentials flow with where the credentials travel', () => {
        const fields = {
            type: 'oauth2',
            grantType: 'client_credentials',
            accessTokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{ _.secret }}',
            scope: 'read',
            audience: 'api',
        };

        expect(authOf(fields, 'request').auth).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{ _.secret }}',
            clientAuth: 'basic',
            scope: 'read',
            audience: 'api',
        });
        expect(authOf({ ...fields, credentialsInBody: true }, 'request').auth).toMatchObject({
            clientAuth: 'body',
        });
    });

    it('leaves out the scope and the audience that were not written', () => {
        const result = authOf(
            { type: 'oauth2', grantType: 'client_credentials', clientSecret: '' },
            'request',
        );

        expect(result.auth).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: '',
            clientId: '',
            clientSecret: '',
            clientAuth: 'basic',
        });
    });

    it('keeps a client secret that was written in the collection', () => {
        const result = authOf(
            { type: 'oauth2', grantType: 'client_credentials', clientSecret: 'abc' },
            'request',
        );

        expect(result.auth).toMatchObject({ clientSecret: 'abc' });
        expect(result.degradations).toEqual([]);
    });

    it('keeps the authorization code flow, which Mandor always runs with PKCE', () => {
        const result = authOf(
            {
                type: 'oauth2',
                grantType: 'authorization_code',
                authorizationUrl: 'https://auth.test/authorize',
                accessTokenUrl: 'https://auth.test/token',
                clientId: 'abc',
                clientSecret: '{{ _.secret }}',
                scope: 'read',
                usePkce: true,
                redirectUrl: 'http://localhost:8080/callback',
            },
            'request',
        );

        expect(result).toEqual({
            auth: {
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: 'abc',
                clientSecret: '{{ _.secret }}',
                scope: 'read',
                redirectPort: 8080,
            },
            degradations: [],
        });
    });

    it('says that Mandor uses PKCE when the document did not ask for it', () => {
        const result = authOf({ type: 'oauth2', grantType: 'authorization_code' }, 'request');

        expect(result.auth).toEqual({
            type: 'oauth2-code-pkce',
            authorizationUrl: '',
            tokenUrl: '',
            clientId: '',
        });
        expect(result.degradations).toEqual([degradation('pkceAlways')]);
    });

    function withRedirect(redirectUrl: string) {
        return authOf(
            { type: 'oauth2', grantType: 'authorization_code', usePkce: true, redirectUrl },
            'request',
        );
    }

    it('pins the loopback port of the redirect', () => {
        const result = withRedirect('http://127.0.0.1:9000/cb');

        expect(result.auth).toMatchObject({ redirectPort: 9000 });
        expect(result.degradations).toEqual([]);
    });

    it.each(['http://127.0.0.1:80/cb', 'https://app.test/cb'])(
        'does not use the redirect %s, and says so',
        (url) => {
            const result = withRedirect(url);

            expect(result.auth).not.toHaveProperty('redirectPort');
            expect(result.degradations).toEqual([
                degradation('redirectNotUsed', { noun: 'URL', address: url }),
            ]);
        },
    );

    it('says nothing of a redirect that was not written', () => {
        const result = withRedirect('');

        expect(result.auth).not.toHaveProperty('redirectPort');
        expect(result.degradations).toEqual([]);
    });

    it('does not hold the other flows, and says so', () => {
        const result = authOf({ type: 'oauth2', grantType: 'implicit' }, 'request');

        expect(result).toEqual({
            auth: { type: 'none' },
            degradations: [degradation('authNoEquivalentRequest', { type: 'oauth2' })],
        });
        expect(authOf({ type: 'oauth2' }, 'folder').degradations[0]).toEqual(
            degradation('authNoEquivalentFolder', { type: 'oauth2' }),
        );
    });
});

describe('authOf: what Mandor has no word for', () => {
    it.each(['digest', 'hawk', 'ntlm', 'oauth1', 'aws-iam', 'netrc', 'asap'])(
        'enters %s with no auth, and says why',
        (type) => {
            expect(authOf({ type }, 'request')).toEqual({
                auth: { type: 'none' },
                degradations: [degradation('authNoEquivalentRequest', { type: type })],
            });
        },
    );
});
