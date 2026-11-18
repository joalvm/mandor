import { describe, expect, it } from 'vitest';

import type { ConcreteAuth } from '@mandor/schema';

import { schemesOf } from '../../src/workspace/security-of-auth.js';

describe('the security schemes an auth chain speaks', () => {
    it('names no scheme for an auth without one', () => {
        const none: ConcreteAuth = { type: 'none' };
        const subprotocol: ConcreteAuth = {
            type: 'apikey',
            name: 'X-Key',
            value: '',
            in: 'subprotocol',
        };

        const aws: ConcreteAuth = { type: 'awsv4', accessKeyId: '', secretAccessKey: '' };

        const { security, nameOf } = schemesOf([none, subprotocol, aws]);

        expect(security).toEqual({});
        expect(nameOf(none)).toBeNull();
        expect(nameOf(subprotocol)).toBeNull();
        expect(nameOf(aws)).toBeNull();
    });

    it.each([
        [
            'basic',
            { type: 'basic', username: '', password: '' } satisfies ConcreteAuth,
            'basicAuth',
            { type: 'http', extras: { scheme: 'basic' } },
        ],
        [
            'bearer',
            { type: 'bearer', token: '' } satisfies ConcreteAuth,
            'bearerAuth',
            { type: 'http', extras: { scheme: 'bearer' } },
        ],
        [
            'apikey header',
            { type: 'apikey', name: 'X-Key', value: '', in: 'header' } satisfies ConcreteAuth,
            'apiKeyAuth',
            { type: 'apiKey', extras: { name: 'X-Key', in: 'header' } },
        ],
        [
            'apikey query',
            { type: 'apikey', name: 'key', value: '', in: 'query' } satisfies ConcreteAuth,
            'apiKeyAuth',
            { type: 'apiKey', extras: { name: 'key', in: 'query' } },
        ],
        [
            'apikey cookie',
            { type: 'apikey', name: 'sid', value: '', in: 'cookie' } satisfies ConcreteAuth,
            'apiKeyAuth',
            { type: 'apiKey', extras: { name: 'sid', in: 'cookie' } },
        ],
        [
            'digest',
            { type: 'digest', username: '', password: '' } satisfies ConcreteAuth,
            'digestAuth',
            { type: 'http', extras: { scheme: 'digest' } },
        ],
        [
            'client credentials',
            {
                type: 'oauth2-client-credentials',
                tokenUrl: 'https://a.b/token',
                clientId: '',
                clientSecret: '',
                clientAuth: 'basic',
                scope: 'read write',
            } satisfies ConcreteAuth,
            'oauth2ClientCredentials',
            {
                type: 'oauth2',
                extras: {
                    flows: {
                        clientCredentials: {
                            tokenUrl: 'https://a.b/token',
                            scopes: { read: '', write: '' },
                        },
                    },
                },
            },
        ],
        [
            'authorization code with pkce',
            {
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://a.b/auth',
                tokenUrl: 'https://a.b/token',
                clientId: '',
                clientSecret: '',
            } satisfies ConcreteAuth,
            'oauth2AuthorizationCode',
            {
                type: 'oauth2',
                extras: {
                    flows: {
                        authorizationCode: {
                            authorizationUrl: 'https://a.b/auth',
                            tokenUrl: 'https://a.b/token',
                            scopes: {},
                        },
                    },
                },
            },
        ],
    ])('maps %s to its scheme', (_name, auth, expectedName, expectedScheme) => {
        const { security, nameOf } = schemesOf([auth]);

        expect(nameOf(auth)).toBe(expectedName);
        expect(security[expectedName]).toEqual(expectedScheme);
    });

    it('gives the second distinct shape of a name the next free suffix', () => {
        const first: ConcreteAuth = { type: 'apikey', name: 'X-Key', value: '', in: 'header' };
        const second: ConcreteAuth = { type: 'apikey', name: 'X-Other', value: '', in: 'query' };

        const { security, nameOf } = schemesOf([first, second]);

        expect(nameOf(second)).toBe('apiKeyAuth2');
        expect(Object.keys(security)).toEqual(['apiKeyAuth', 'apiKeyAuth2']);
    });

    it('answers the same name for the same shape, however far apart in the chain', () => {
        const folder: ConcreteAuth = { type: 'bearer', token: 'folder' };
        const item: ConcreteAuth = { type: 'bearer', token: 'item' };

        const { nameOf } = schemesOf([folder, item]);

        expect(nameOf(folder)).toBe('bearerAuth');
        expect(nameOf(item)).toBe('bearerAuth');
    });
});
