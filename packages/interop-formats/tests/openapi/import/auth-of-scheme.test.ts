import { degradation, type InteropSecurityScheme } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authOfScheme } from '../../../src/openapi/import/auth-of-scheme.js';

function scheme(type: string, extras: Record<string, unknown> = {}): InteropSecurityScheme {
    return { type, extras };
}

describe('the auth a security scheme becomes', () => {
    it('maps basic and bearer to a template the person fills in', () => {
        expect(authOfScheme(scheme('http', { scheme: 'Basic' }))).toEqual({
            auth: { type: 'basic', username: '{{username}}', password: '{{password}}' },
            variables: ['username', 'password'],
        });
        expect(authOfScheme(scheme('http', { scheme: 'bearer' }))).toEqual({
            auth: { type: 'bearer', token: '{{token}}' },
            variables: ['token'],
        });
    });

    it('maps an api key with the place it travels in', () => {
        expect(authOfScheme(scheme('apiKey', { name: 'X-Key', in: 'header' }))).toEqual({
            auth: { type: 'apikey', name: 'X-Key', value: '{{apiKey}}', in: 'header' },
            variables: ['apiKey'],
        });
        expect(authOfScheme(scheme('apiKey', { name: 'k', in: 'query' }))).toMatchObject({
            auth: { in: 'query' },
        });
        expect(authOfScheme(scheme('apiKey', { name: 'k', in: 'cookie' }))).toMatchObject({
            auth: { in: 'cookie' },
        });
    });

    it('maps the client credentials flow with its scopes joined by a space', () => {
        const flows = {
            clientCredentials: {
                tokenUrl: 'https://auth.test/token',
                scopes: { read: '', write: '' },
            },
        };

        expect(authOfScheme(scheme('oauth2', { flows }))).toEqual({
            auth: {
                type: 'oauth2-client-credentials',
                tokenUrl: 'https://auth.test/token',
                clientId: '{{clientId}}',
                clientSecret: '{{clientSecret}}',
                clientAuth: 'basic',
                scope: 'read write',
            },
            variables: ['clientId', 'clientSecret'],
        });
    });

    it('maps the authorization code flow, and leaves the scope out when there is none', () => {
        const flows = {
            authorizationCode: {
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                scopes: {},
            },
        };

        expect(authOfScheme(scheme('oauth2', { flows }))).toEqual({
            auth: {
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: '{{clientId}}',
            },
            variables: ['clientId'],
        });
    });

    it('says why a scheme has no auth in Mandor', () => {
        const reasons = [
            authOfScheme(scheme('http', { scheme: 'digest' })),
            authOfScheme(scheme('http')),
            authOfScheme(scheme('apiKey', { name: 'k', in: 'body' })),
            authOfScheme(scheme('apiKey')),
            authOfScheme(scheme('oauth2', { flows: { implicit: {} } })),
            authOfScheme(scheme('oauth2')),
            authOfScheme(scheme('oauth2', { flows: { clientCredentials: {} } })),
            authOfScheme(scheme('oauth2', { flows: { authorizationCode: { tokenUrl: 't' } } })),
            authOfScheme(scheme('openIdConnect')),
        ];

        expect(reasons).toEqual([
            { reason: degradation('securityHttpUnsupported', { scheme: 'digest' }) },
            { reason: degradation('securityHttpUnsupported', { scheme: '' }) },
            { reason: degradation('securityApiKeyPlace', { where: 'body' }) },
            { reason: degradation('securityApiKeyUnplaced') },
            { reason: degradation('securityFlowsUnsupported', { flows: 'implicit' }) },
            { reason: degradation('securityFlowsUnsupported', { flows: '' }) },
            { reason: degradation('securityFlowNoTokenUrl', { flow: 'clientCredentials' }) },
            {
                reason: degradation('securityFlowNoAuthorizationUrl', {
                    flow: 'authorizationCode',
                }),
            },
            { reason: degradation('securityTypeUnsupported', { type: 'openIdConnect' }) },
        ]);
    });
});
