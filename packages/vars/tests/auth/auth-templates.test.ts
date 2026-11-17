import { describe, expect, it } from 'vitest';

import { authTemplates } from '../../src/auth/auth-templates.js';

describe('authTemplates', () => {
    it('names the two fields of basic, ready for resolveTemplates next to the request ones', () => {
        expect(authTemplates({ type: 'basic', username: '{{user}}', password: 'plain' })).toEqual({
            'auth:username': '{{user}}',
            'auth:password': 'plain',
        });
    });

    it('names the token of bearer, and the prefix only when somebody wrote one', () => {
        expect(authTemplates({ type: 'bearer', token: '{{token}}' })).toEqual({
            'auth:token': '{{token}}',
        });
        expect(authTemplates({ type: 'bearer', token: 't', prefix: 'Token' })).toEqual({
            'auth:token': 't',
            'auth:prefix': 'Token',
        });
    });

    it('names the pair of an api key, whatever its placement', () => {
        expect(
            authTemplates({ type: 'apikey', name: 'X-Key', value: '{{key}}', in: 'query' }),
        ).toEqual({ 'auth:name': 'X-Key', 'auth:value': '{{key}}' });
    });

    it('names every field of client credentials, the optional ones only when written', () => {
        expect(
            authTemplates({
                type: 'oauth2-client-credentials',
                tokenUrl: '{{base}}/token',
                clientId: '{{id}}',
                clientSecret: '{{secret}}',
                clientAuth: 'basic',
            }),
        ).toEqual({
            'auth:tokenUrl': '{{base}}/token',
            'auth:clientId': '{{id}}',
            'auth:clientSecret': '{{secret}}',
        });
        expect(
            authTemplates({
                type: 'oauth2-client-credentials',
                tokenUrl: 't',
                clientId: 'i',
                clientSecret: 's',
                clientAuth: 'body',
                scope: 'read',
                audience: 'api',
            }),
        ).toMatchObject({ 'auth:scope': 'read', 'auth:audience': 'api' });
    });

    it('names the fields of code with pkce, the secret only for a confidential client', () => {
        expect(
            authTemplates({
                type: 'oauth2-code-pkce',
                authorizationUrl: '{{base}}/authorize',
                tokenUrl: '{{base}}/token',
                clientId: 'id',
                scope: 'openid',
            }),
        ).toEqual({
            'auth:authorizationUrl': '{{base}}/authorize',
            'auth:tokenUrl': '{{base}}/token',
            'auth:clientId': 'id',
            'auth:scope': 'openid',
        });
        expect(
            authTemplates({
                type: 'oauth2-code-pkce',
                authorizationUrl: 'a',
                tokenUrl: 't',
                clientId: 'i',
                clientSecret: '{{secret}}',
            }),
        ).toMatchObject({ 'auth:clientSecret': '{{secret}}' });
    });

    it('names the pair of digest', () => {
        expect(authTemplates({ type: 'digest', username: 'u', password: '{{p}}' })).toEqual({
            'auth:username': 'u',
            'auth:password': '{{p}}',
        });
    });

    it('names the keys of aws v4, region, service and session token only when written', () => {
        expect(authTemplates({ type: 'awsv4', accessKeyId: 'a', secretAccessKey: 's' })).toEqual({
            'auth:accessKeyId': 'a',
            'auth:secretAccessKey': 's',
        });
        expect(
            authTemplates({
                type: 'awsv4',
                accessKeyId: 'a',
                secretAccessKey: 's',
                region: 'r',
                service: 'v',
                sessionToken: 't',
            }),
        ).toEqual({
            'auth:accessKeyId': 'a',
            'auth:secretAccessKey': 's',
            'auth:region': 'r',
            'auth:service': 'v',
            'auth:sessionToken': 't',
        });
    });

    it('produces nothing for none: no field carries a template', () => {
        expect(authTemplates({ type: 'none' })).toEqual({});
    });

    it('produces nothing for inherit: the level that decided resolves its own', () => {
        expect(authTemplates({ inherit: true })).toEqual({});
    });
});
