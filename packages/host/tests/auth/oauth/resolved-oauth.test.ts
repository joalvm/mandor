import { describe, expect, it } from 'vitest';

import { resolvedOAuth } from '../../../src/auth/oauth/resolved-oauth.js';

describe('resolvedOAuth', () => {
    it('puts the resolved values where the templates were, field by field', () => {
        const resolved = resolvedOAuth(
            {
                type: 'oauth2-client-credentials',
                tokenUrl: '{{base}}/token',
                clientId: '{{id}}',
                clientSecret: '{{secret}}',
                clientAuth: 'body',
                scope: '{{scope}}',
            },
            {
                'auth:tokenUrl': 'https://idp.example/token',
                'auth:clientId': 'client',
                'auth:clientSecret': 's3cret',
                'auth:scope': 'read',
            },
        );

        expect(resolved).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://idp.example/token',
            clientId: 'client',
            clientSecret: 's3cret',
            clientAuth: 'body',
            scope: 'read',
        });
    });

    it('keeps the optional fields out when the file did not write them', () => {
        const resolved = resolvedOAuth(
            {
                type: 'oauth2-code-pkce',
                authorizationUrl: 'a',
                tokenUrl: 't',
                clientId: 'i',
                redirectPort: 8123,
            },
            { 'auth:authorizationUrl': 'a', 'auth:tokenUrl': 't', 'auth:clientId': 'i' },
        );

        expect(resolved).toEqual({
            type: 'oauth2-code-pkce',
            authorizationUrl: 'a',
            tokenUrl: 't',
            clientId: 'i',
            redirectPort: 8123,
        });
    });
});
