import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { authDocumentOf } from '../../../src/insomnia/export/auth-document.js';

describe('authDocumentOf', () => {
    it('writes none as none', () => {
        expect(authDocumentOf({ type: 'none' })).toEqual({ type: 'none' });
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

    it('writes a bearer token with its prefix, and leaves out what it has not got', () => {
        expect(authDocumentOf({ type: 'bearer', token: '{{t}}', prefix: 'Token' })).toEqual({
            type: 'bearer',
            token: '{{t}}',
            prefix: 'Token',
        });
        expect(authDocumentOf({ type: 'bearer', token: 'literal' })).toEqual({
            type: 'bearer',
            token: 'literal',
        });
    });

    it('writes an api key in the subprotocol as the header its value travels in', () => {
        expect(
            authDocumentOf({ type: 'apikey', name: 'X-Key', value: '{{k}}', in: 'subprotocol' }),
        ).toEqual({
            type: 'apikey',
            key: 'Sec-WebSocket-Protocol',
            value: '{{k}}',
            addTo: 'header',
        });
    });

    it.each([
        ['header', 'header'],
        ['query', 'queryParams'],
        ['cookie', 'cookie'],
    ] as const)('writes an api key in the %s as added to %s', (place, addTo) => {
        expect(
            authDocumentOf({ type: 'apikey', name: 'X-Key', value: '{{k}}', in: place }),
        ).toEqual({
            type: 'apikey',
            key: 'X-Key',
            value: '{{k}}',
            addTo,
        });
    });

    it('writes an api key as it was written in the workspace', () => {
        expect(
            authDocumentOf({ type: 'apikey', name: 'X-Key', value: 'abc', in: 'header' }),
        ).toMatchObject({ value: 'abc' });
    });

    it('writes the client credentials flow with where the credentials travel', () => {
        const auth: ConcreteAuth = {
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{secret}}',
            clientAuth: 'body',
            scope: 'read',
            audience: 'api',
        };

        expect(authDocumentOf(auth)).toEqual({
            type: 'oauth2',
            grantType: 'client_credentials',
            accessTokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{secret}}',
            credentialsInBody: true,
            scope: 'read',
            audience: 'api',
        });
        expect(authDocumentOf({ ...auth, clientAuth: 'basic' })).toMatchObject({
            credentialsInBody: false,
        });
    });

    it('writes a client secret as it was written, and leaves out what is empty', () => {
        expect(
            authDocumentOf({
                type: 'oauth2-client-credentials',
                tokenUrl: 'https://auth.test/token',
                clientId: 'abc',
                clientSecret: 'hunter2',
                clientAuth: 'basic',
            }),
        ).toEqual({
            type: 'oauth2',
            grantType: 'client_credentials',
            accessTokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: 'hunter2',
            credentialsInBody: false,
        });
    });

    it('writes the authorization code flow, with PKCE and the loopback redirect of its port', () => {
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
            grantType: 'authorization_code',
            usePkce: true,
            authorizationUrl: 'https://auth.test/authorize',
            accessTokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{secret}}',
            scope: 'read',
            redirectUrl: 'http://127.0.0.1:8080/',
        });
    });

    it('writes the authorization code flow with no redirect, no secret and no scope', () => {
        expect(
            authDocumentOf({
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: 'abc',
            }),
        ).toEqual({
            type: 'oauth2',
            grantType: 'authorization_code',
            usePkce: true,
            authorizationUrl: 'https://auth.test/authorize',
            accessTokenUrl: 'https://auth.test/token',
            clientId: 'abc',
        });
    });
});
