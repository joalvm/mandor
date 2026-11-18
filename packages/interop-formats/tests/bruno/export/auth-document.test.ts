import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { authDocumentOf, authEntryOf } from '../../../src/bruno/export/auth-document.js';

describe('authDocumentOf', () => {
    it('writes nothing for none, which Bruno has no scheme for', () => {
        expect(authDocumentOf({ type: 'none' })).toBeUndefined();
    });

    it('writes a basic auth that points at variables', () => {
        expect(authDocumentOf({ type: 'basic', username: 'ana', password: '{{pw}}' })).toEqual({
            type: 'basic',
            username: 'ana',
            password: '{{pw}}',
        });
    });

    it('writes a password as it was written in the workspace', () => {
        expect(authDocumentOf({ type: 'basic', username: 'ana', password: 'hunter2' })).toEqual({
            type: 'basic',
            username: 'ana',
            password: 'hunter2',
        });
    });

    it('writes a bearer token, a literal one as it was written', () => {
        expect(authDocumentOf({ type: 'bearer', token: '{{t}}', prefix: 'Token' })).toEqual({
            type: 'bearer',
            token: '{{t}}',
        });
        expect(authDocumentOf({ type: 'bearer', token: 'literal' })).toEqual({
            type: 'bearer',
            token: 'literal',
        });
    });

    it.each([
        ['header', 'header'],
        ['query', 'query'],
    ] as const)('writes an api key in the %s as placed in the %s', (place, placement) => {
        expect(
            authDocumentOf({ type: 'apikey', name: 'X-Key', value: '{{k}}', in: place }),
        ).toEqual({ type: 'apikey', key: 'X-Key', value: '{{k}}', placement });
    });

    it('writes an api key as it was written in the workspace', () => {
        expect(
            authDocumentOf({ type: 'apikey', name: 'X-Key', value: 'abc', in: 'header' }),
        ).toMatchObject({ value: 'abc' });
    });
});

describe('authDocumentOf: oauth2', () => {
    const CLIENT: ConcreteAuth = {
        type: 'oauth2-client-credentials',
        tokenUrl: 'https://auth.test/token',
        clientId: 'abc',
        clientSecret: '{{secret}}',
        clientAuth: 'body',
        scope: 'read',
        audience: 'api',
    };

    it('writes the client credentials flow with where the credentials travel', () => {
        expect(authDocumentOf(CLIENT)).toEqual({
            type: 'oauth2',
            flow: 'client_credentials',
            accessTokenUrl: 'https://auth.test/token',
            credentials: { clientId: 'abc', clientSecret: '{{secret}}', placement: 'body' },
            scope: 'read',
            additionalParameters: {
                accessTokenRequest: [{ name: 'audience', value: 'api', placement: 'body' }],
            },
        });
        expect(authDocumentOf({ ...CLIENT, clientAuth: 'basic' })).toMatchObject({
            credentials: { placement: 'basic_auth_header' },
        });
    });

    it('writes a client secret as it was written, and leaves out what is empty', () => {
        const auth: ConcreteAuth = {
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: 'hunter2',
            clientAuth: 'basic',
        };

        expect(authDocumentOf(auth)).toEqual({
            type: 'oauth2',
            flow: 'client_credentials',
            accessTokenUrl: 'https://auth.test/token',
            credentials: {
                clientId: 'abc',
                clientSecret: 'hunter2',
                placement: 'basic_auth_header',
            },
        });
    });

    it('writes the authorization code flow, with PKCE and the loopback callback of its port', () => {
        expect(
            authDocumentOf({
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: 'abc',
                clientSecret: '{{secret}}',
                scope: 'read',
                redirectPort: 8080,
            }),
        ).toEqual({
            type: 'oauth2',
            flow: 'authorization_code',
            authorizationUrl: 'https://auth.test/authorize',
            accessTokenUrl: 'https://auth.test/token',
            callbackUrl: 'http://127.0.0.1:8080/',
            scope: 'read',
            credentials: { clientId: 'abc', clientSecret: '{{secret}}' },
            pkce: { method: 'S256' },
        });
    });

    it('writes the authorization code flow with no callback, no secret and no scope', () => {
        expect(
            authDocumentOf({
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: 'abc',
            }),
        ).toEqual({
            type: 'oauth2',
            flow: 'authorization_code',
            authorizationUrl: 'https://auth.test/authorize',
            accessTokenUrl: 'https://auth.test/token',
            credentials: { clientId: 'abc' },
            pkce: { method: 'S256' },
        });
    });
});

describe('authEntryOf', () => {
    it('inherits when the level speaks no auth', () => {
        expect(authEntryOf(undefined)).toEqual({ auth: 'inherit' });
    });

    it('writes the auth a level speaks', () => {
        expect(authEntryOf({ type: 'bearer', token: '{{t}}' })).toEqual({
            auth: { type: 'bearer', token: '{{t}}' },
        });
    });

    it('writes no entry for a level that stops the inheritance', () => {
        expect(authEntryOf({ type: 'none' })).toEqual({});
    });

    it.each([
        ['cookie', 'Cookie', 'sid={{k}}'],
        ['subprotocol', 'Sec-WebSocket-Protocol', '{{k}}'],
    ] as const)(
        'writes an api key in the %s as the header that carries it',
        (place, key, value) => {
            expect(
                authDocumentOf({ type: 'apikey', name: 'sid', value: '{{k}}', in: place }),
            ).toEqual({
                type: 'apikey',
                key,
                value,
                placement: 'header',
            });
        },
    );
});
