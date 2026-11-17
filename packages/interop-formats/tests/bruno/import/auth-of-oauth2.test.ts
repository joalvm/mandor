import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authOf } from '../../../src/bruno/import/auth-of.js';

const CLIENT_CREDENTIALS = {
    type: 'oauth2',
    flow: 'client_credentials',
    accessTokenUrl: 'https://auth.test/token',
    clientId: 'abc',
    clientSecret: '{{secret}}',
    scope: 'read',
    placement: 'basic_auth_header',
};

describe('authOf: oauth2 client credentials', () => {
    it('keeps the flow with where the credentials travel', () => {
        expect(authOf(CLIENT_CREDENTIALS, 'request').auth).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{secret}}',
            clientAuth: 'basic',
            scope: 'read',
        });
        expect(authOf({ ...CLIENT_CREDENTIALS, placement: 'body' }, 'request').auth).toMatchObject({
            clientAuth: 'body',
        });
    });

    it('leaves out the scope that was not written', () => {
        const result = authOf({ type: 'oauth2', flow: 'client_credentials' }, 'request');

        expect(result.auth).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: '',
            clientId: '',
            clientSecret: '',
            clientAuth: 'basic',
        });
    });

    it('keeps a client secret that was written in the collection', () => {
        const result = authOf({ ...CLIENT_CREDENTIALS, clientSecret: 'abc' }, 'request');

        expect(result.auth).toMatchObject({ clientSecret: 'abc' });
        expect(result.degradations).toEqual([]);
    });
});

describe('authOf: oauth2 authorization code', () => {
    const CODE = {
        type: 'oauth2',
        flow: 'authorization_code',
        authorizationUrl: 'https://auth.test/authorize',
        accessTokenUrl: 'https://auth.test/token',
        clientId: 'abc',
        clientSecret: '{{secret}}',
        scope: 'read',
        pkce: true,
        callbackUrl: 'http://localhost:8080/callback',
    };

    it('keeps the flow, which Mandor always runs with PKCE', () => {
        expect(authOf(CODE, 'request')).toEqual({
            auth: {
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: 'abc',
                clientSecret: '{{secret}}',
                scope: 'read',
                redirectPort: 8080,
            },
            degradations: [],
        });
    });

    it('says that Mandor uses PKCE when the document did not ask for it', () => {
        const result = authOf({ type: 'oauth2', flow: 'authorization_code' }, 'request');

        expect(result.auth).toEqual({
            type: 'oauth2-code-pkce',
            authorizationUrl: '',
            tokenUrl: '',
            clientId: '',
        });
        expect(result.degradations).toEqual([degradation('pkceAlways')]);
    });

    it('pins the loopback port of the callback', () => {
        const result = authOf({ ...CODE, callbackUrl: 'http://127.0.0.1:9000/cb' }, 'request');

        expect(result.auth).toMatchObject({ redirectPort: 9000 });
        expect(result.degradations).toEqual([]);
    });

    it.each(['http://127.0.0.1:80/cb', 'https://app.test/cb'])(
        'does not use the callback %s, and says so',
        (callbackUrl) => {
            const result = authOf({ ...CODE, callbackUrl }, 'request');

            expect(result.auth).not.toHaveProperty('redirectPort');
            expect(result.degradations).toEqual([
                degradation('redirectNotUsed', { noun: 'URL', address: callbackUrl }),
            ]);
        },
    );

    it('says nothing of a callback that was not written', () => {
        const result = authOf({ ...CODE, callbackUrl: '' }, 'request');

        expect(result.auth).not.toHaveProperty('redirectPort');
        expect(result.degradations).toEqual([]);
    });

    it('keeps a client secret that was written in the collection', () => {
        const result = authOf({ ...CODE, clientSecret: 'abc' }, 'request');

        expect(result.auth).toMatchObject({ clientSecret: 'abc' });
    });
});

describe('authOf: the flows Mandor does not hold', () => {
    it.each(['password', 'implicit', ''])('does not hold the flow "%s", and says so', (flow) => {
        expect(authOf({ type: 'oauth2', flow }, 'request')).toEqual({
            auth: { type: 'none' },
            degradations: [degradation('authNoEquivalentRequest', { type: 'oauth2' })],
        });
    });
});
