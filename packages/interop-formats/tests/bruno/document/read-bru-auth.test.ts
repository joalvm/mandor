import { describe, expect, it } from 'vitest';

import { authOfBru } from '../../../src/bruno/document/read-bru-auth.js';

describe('authOfBru', () => {
    it('says nothing for a level that names no mode', () => {
        expect(authOfBru(undefined, undefined)).toBeUndefined();
        expect(authOfBru(null, {})).toBeUndefined();
        expect(authOfBru('', {})).toBeUndefined();
    });

    it('keeps only the name of a mode with no fields, such as inherit and none', () => {
        expect(authOfBru('inherit', undefined)).toEqual({ type: 'inherit' });
        expect(authOfBru('none', {})).toEqual({ type: 'none' });
        expect(authOfBru('digest', { digest: { username: 'a' } })).toEqual({ type: 'digest' });
    });

    it('reads the block of the scheme the mode names', () => {
        expect(authOfBru('basic', { basic: { username: 'a', password: 'b' } })).toEqual({
            type: 'basic',
            username: 'a',
            password: 'b',
        });
        expect(authOfBru('bearer', { bearer: { token: 't' } })).toEqual({
            type: 'bearer',
            token: 't',
        });
    });

    it('reads a scheme whose block is missing as one with empty fields', () => {
        expect(authOfBru('bearer', {})).toEqual({ type: 'bearer', token: '' });
        expect(authOfBru('bearer', { bearer: 'x' })).toEqual({ type: 'bearer', token: '' });
        expect(authOfBru('bearer', undefined)).toEqual({ type: 'bearer', token: '' });
    });

    it('tells where an api key travels, the header being the place of anything it does not know', () => {
        const key = (placement: string) =>
            authOfBru('apikey', { apikey: { key: 'k', value: 'v', placement } });

        expect(key('queryparams')).toEqual({
            type: 'apikey',
            key: 'k',
            value: 'v',
            placement: 'query',
        });
        expect(key('header')).toMatchObject({ placement: 'header' });
        expect(key('cookie')).toMatchObject({ placement: 'header' });
    });

    it('reads the fields of oauth2 under the names the tree uses', () => {
        expect(
            authOfBru('oauth2', {
                oauth2: {
                    grantType: 'authorization_code',
                    accessTokenUrl: 't',
                    authorizationUrl: 'a',
                    callbackUrl: 'http://localhost:8080/cb',
                    clientId: 'c',
                    clientSecret: 's',
                    credentialsPlacement: 'basic_auth_header',
                    scope: 'x',
                    pkce: true,
                },
            }),
        ).toEqual({
            type: 'oauth2',
            flow: 'authorization_code',
            accessTokenUrl: 't',
            authorizationUrl: 'a',
            callbackUrl: 'http://localhost:8080/cb',
            clientId: 'c',
            clientSecret: 's',
            placement: 'basic_auth_header',
            scope: 'x',
            pkce: true,
        });
    });

    it('names the flow of the password grant as OpenCollection does, and keeps another as is', () => {
        expect(authOfBru('oauth2', { oauth2: { grantType: 'password' } })).toMatchObject({
            flow: 'resource_owner_password_credentials',
            pkce: false,
        });
        expect(authOfBru('oauth2', { oauth2: { grantType: 'client_credentials' } })).toMatchObject({
            flow: 'client_credentials',
        });
    });
});
