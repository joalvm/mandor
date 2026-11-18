import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authConfigOf } from '../../../src/postman/import/auth-config-of.js';

function scheme(type: string, extras: Record<string, unknown>) {
    return { type, extras };
}

function oauth(extras: Record<string, unknown>) {
    return scheme('oauth2', {
        accessTokenUrl: 'https://t.test/token',
        authUrl: 'https://t.test/auth',
        clientId: 'abc',
        ...extras,
    });
}

describe('authConfigOf: oauth2', () => {
    it('maps the client credentials grant, with the secret as it came and the client auth in the body or the header', () => {
        const result = authConfigOf(
            oauth({
                grant_type: 'client_credentials',
                clientSecret: 'x',
                client_authentication: 'body',
                scope: 'read',
                audience: 'api',
            }),
            'request',
        );

        expect(result.auth).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://t.test/token',
            clientId: 'abc',
            clientSecret: 'x',
            clientAuth: 'body',
            scope: 'read',
            audience: 'api',
        });
        expect(result.degradations).toEqual([]);
        expect(
            authConfigOf(oauth({ grant_type: 'client_credentials' }), 'request').auth,
        ).toMatchObject({
            clientAuth: 'basic',
        });
    });

    it('maps the code grant to PKCE, and says it always uses PKCE unless the file asked for it', () => {
        const plain = authConfigOf(oauth({ grant_type: 'authorization_code' }), 'request');
        const pkce = authConfigOf(
            oauth({ grant_type: 'authorization_code_with_pkce', scope: 's' }),
            'request',
        );
        const none = authConfigOf(oauth({}), 'request');

        expect(plain.auth).toEqual({
            type: 'oauth2-code-pkce',
            authorizationUrl: 'https://t.test/auth',
            tokenUrl: 'https://t.test/token',
            clientId: 'abc',
        });
        expect(plain.degradations).toEqual([degradation('pkceAlways')]);
        expect(none.degradations).toEqual(plain.degradations);
        expect(pkce.auth).toMatchObject({ scope: 's' });
        expect(pkce.degradations).toEqual([]);
    });

    it('keeps a client secret that points at a variable, drops a literal one and an audience', () => {
        const kept = authConfigOf(
            oauth({ grant_type: 'authorization_code_with_pkce', clientSecret: '{{s}}' }),
            'request',
        );
        const dropped = authConfigOf(
            oauth({
                grant_type: 'authorization_code_with_pkce',
                clientSecret: 'lit',
                audience: 'api',
            }),
            'request',
        );

        expect(kept.auth).toMatchObject({ clientSecret: '{{s}}' });
        expect(dropped.auth).toMatchObject({ clientSecret: 'lit' });
        expect(dropped.degradations).toEqual([degradation('audienceNotKept', { audience: 'api' })]);
    });

    it.each([
        ['http://127.0.0.1:8123/cb', 8123, []],
        ['http://localhost:5000', 5000, []],
        [
            'http://localhost:80/cb',
            undefined,
            [degradation('redirectNotUsed', { noun: 'URI', address: 'http://localhost:80/cb' })],
        ],
        [
            'https://oauth.pstmn.io/v1/callback',
            undefined,
            [
                degradation('redirectNotUsed', {
                    noun: 'URI',
                    address: 'https://oauth.pstmn.io/v1/callback',
                }),
            ],
        ],
        ['', undefined, []],
    ])('reads the redirect uri %s', (uri, port, notes) => {
        const result = authConfigOf(
            oauth({ grant_type: 'authorization_code_with_pkce', redirect_uri: uri }),
            'request',
        );

        expect(result.auth).toMatchObject(port === undefined ? {} : { redirectPort: port });
        expect(result.degradations).toEqual(notes);
    });
});
