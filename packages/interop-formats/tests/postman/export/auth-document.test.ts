import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { authDocumentOf } from '../../../src/postman/export/auth-document.js';

function rows(pairs: Record<string, string>) {
    return Object.entries(pairs).map(([key, value]) => ({ key, value, type: 'string' }));
}

const SCHEMES: [string, ConcreteAuth, unknown][] = [
    ['none', { type: 'none' }, { type: 'noauth' }],
    [
        'basic',
        { type: 'basic', username: 'admin', password: '{{password}}' },
        { type: 'basic', basic: rows({ username: 'admin', password: '{{password}}' }) },
    ],
    [
        'bearer',
        { type: 'bearer', token: '{{token}}' },
        { type: 'bearer', bearer: rows({ token: '{{token}}' }) },
    ],
    [
        'apikey',
        { type: 'apikey', name: 'X-Key', value: '{{key}}', in: 'query' },
        { type: 'apikey', apikey: rows({ key: 'X-Key', value: '{{key}}', in: 'query' }) },
    ],
    [
        'digest',
        { type: 'digest', username: 'admin', password: 'hunter2' },
        { type: 'digest', digest: rows({ username: 'admin', password: 'hunter2' }) },
    ],
    [
        'aws signature v4',
        {
            type: 'awsv4',
            accessKeyId: '{{key}}',
            secretAccessKey: '{{secret}}',
            region: 'eu-west-1',
            service: 's3',
            sessionToken: 'literal',
        },
        {
            type: 'awsv4',
            awsv4: rows({
                accessKey: '{{key}}',
                secretKey: '{{secret}}',
                region: 'eu-west-1',
                service: 's3',
                sessionToken: 'literal',
            }),
        },
    ],
    [
        'client credentials',
        {
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://id.test/token',
            clientId: 'abc',
            clientSecret: '{{secret}}',
            clientAuth: 'basic',
            scope: 'read',
        },
        {
            type: 'oauth2',
            oauth2: rows({
                grant_type: 'client_credentials',
                accessTokenUrl: 'https://id.test/token',
                clientId: 'abc',
                clientSecret: '{{secret}}',
                client_authentication: 'header',
                scope: 'read',
            }),
        },
    ],
    [
        'code with PKCE',
        {
            type: 'oauth2-code-pkce',
            authorizationUrl: 'https://id.test/auth',
            tokenUrl: 'https://id.test/token',
            clientId: 'abc',
            redirectPort: 8123,
        },
        {
            type: 'oauth2',
            oauth2: rows({
                grant_type: 'authorization_code_with_pkce',
                authUrl: 'https://id.test/auth',
                accessTokenUrl: 'https://id.test/token',
                clientId: 'abc',
                redirect_uri: 'http://127.0.0.1:8123/',
            }),
        },
    ],
    [
        'code with PKCE and no fixed port',
        {
            type: 'oauth2-code-pkce',
            authorizationUrl: 'https://id.test/auth',
            tokenUrl: 'https://id.test/token',
            clientId: 'abc',
        },
        {
            type: 'oauth2',
            oauth2: rows({
                grant_type: 'authorization_code_with_pkce',
                authUrl: 'https://id.test/auth',
                accessTokenUrl: 'https://id.test/token',
                clientId: 'abc',
            }),
        },
    ],
];

describe('auth-document: an auth as the scheme Postman lists', () => {
    it.each(SCHEMES)('writes %s under the type Postman knows it by', (_name, auth, expected) => {
        expect(authDocumentOf(auth)).toEqual(expected);
    });

    it('says the body when the client sends its secret there', () => {
        const document = authDocumentOf({
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://id.test/token',
            clientId: 'abc',
            clientSecret: '',
            clientAuth: 'body',
        });

        expect(document['oauth2']).toContainEqual({
            key: 'client_authentication',
            value: 'body',
            type: 'string',
        });
    });

    it('writes a credential typed into the workspace as it was written', () => {
        const document = authDocumentOf({
            type: 'basic',
            username: 'admin',
            password: 'written-by-hand',
        });

        expect(document['basic']).toEqual(rows({ username: 'admin', password: 'written-by-hand' }));
    });
});
