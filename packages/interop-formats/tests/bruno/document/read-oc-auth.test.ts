import { describe, expect, it } from 'vitest';

import { authOfOpenCollection } from '../../../src/bruno/document/read-oc-auth.js';

describe('authOfOpenCollection', () => {
    it('says nothing for a level that writes no auth', () => {
        expect(authOfOpenCollection(undefined)).toBeUndefined();
        expect(authOfOpenCollection(null)).toBeUndefined();
    });

    it('keeps the word inherit as the type', () => {
        expect(authOfOpenCollection('inherit')).toEqual({ type: 'inherit' });
    });

    it('keeps the fields a scheme wrote and nothing it did not', () => {
        expect(authOfOpenCollection({ type: 'basic', username: 'a', password: 'b' })).toEqual({
            type: 'basic',
            username: 'a',
            password: 'b',
        });
        expect(authOfOpenCollection({ type: 'bearer', token: 't' })).toEqual({
            type: 'bearer',
            token: 't',
        });
        expect(
            authOfOpenCollection({ type: 'apikey', key: 'k', value: 'v', placement: 'query' }),
        ).toEqual({ type: 'apikey', key: 'k', value: 'v', placement: 'query' });
    });

    it('flattens the credentials of oauth2 and tells whether it uses PKCE', () => {
        expect(
            authOfOpenCollection({
                type: 'oauth2',
                flow: 'authorization_code',
                accessTokenUrl: 'https://a/token',
                authorizationUrl: 'https://a/auth',
                callbackUrl: 'http://localhost:8080/cb',
                scope: 'read',
                credentials: { clientId: 'id', clientSecret: 's', placement: 'body' },
                pkce: {},
            }),
        ).toEqual({
            type: 'oauth2',
            flow: 'authorization_code',
            accessTokenUrl: 'https://a/token',
            authorizationUrl: 'https://a/auth',
            callbackUrl: 'http://localhost:8080/cb',
            clientId: 'id',
            clientSecret: 's',
            placement: 'body',
            scope: 'read',
            pkce: true,
        });
    });

    it('takes PKCE as off when it is disabled or absent', () => {
        expect(authOfOpenCollection({ type: 'oauth2', pkce: { disabled: true } })).toMatchObject({
            pkce: false,
        });
        expect(authOfOpenCollection({ type: 'oauth2' })).toMatchObject({ pkce: false });
    });
});
