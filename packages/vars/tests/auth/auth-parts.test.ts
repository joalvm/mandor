import { describe, expect, it } from 'vitest';

import type { ApiKeyAuth, ConcreteAuth } from '@mandor/schema';

import { authParts } from '../../src/auth/auth-parts.js';

describe('authParts', () => {
    it('produces the Basic header as base64 of the utf-8 pair', () => {
        // base64(utf8('aná:s3cret')) — the credentials travel as the standard says, not as
        // btoa would mangle them in latin1.
        const parts = authParts({ type: 'basic', username: 'aná', password: 's3cret' }, {});

        expect(parts.headers).toEqual([['Authorization', 'Basic YW7DoTpzM2NyZXQ=']]);
        expect(parts.query).toEqual([]);
        expect(parts.cookies).toEqual([]);
        expect(parts.subprotocols).toEqual([]);
    });

    it('solves the credentials from the resolved templates', () => {
        const parts = authParts(
            { type: 'basic', username: '{{user}}', password: '{{pass}}' },
            { 'auth:username': 'ana', 'auth:password': 's3cret' },
        );

        expect(parts.headers).toEqual([['Authorization', `Basic ${btoa('ana:s3cret')}`]]);
    });

    it('prefixes the bearer token with Bearer when no prefix was written', () => {
        const parts = authParts({ type: 'bearer', token: 'abc123' }, {});

        expect(parts.headers).toEqual([['Authorization', 'Bearer abc123']]);
    });

    it('uses the written prefix of a bearer, an empty one meaning the token alone', () => {
        const prefixed = authParts(
            { type: 'bearer', token: 't', prefix: '{{prefix}}' },
            { 'auth:prefix': 'Token' },
        );

        expect(prefixed.headers).toEqual([['Authorization', 'Token t']]);

        const bare = authParts({ type: 'bearer', token: 't', prefix: '' }, { 'auth:prefix': '' });

        expect(bare.headers).toEqual([['Authorization', 't']]);
    });

    it('places an api key where its placement says: the value travels in the subprotocol', () => {
        const auth: ApiKeyAuth = { type: 'apikey', name: 'X-Key', value: 'k1', in: 'header' };

        expect(authParts(auth, {}).headers).toEqual([['X-Key', 'k1']]);
        expect(authParts({ ...auth, in: 'query' }, {}).query).toEqual([['X-Key', 'k1']]);
        expect(authParts({ ...auth, in: 'cookie' }, {}).cookies).toEqual([['X-Key', 'k1']]);
        expect(authParts({ ...auth, in: 'subprotocol' }, {}).subprotocols).toEqual(['k1']);
    });

    it('turns the token an oauth2 flow produced into a bearer header, whichever the flow', () => {
        const credentials: ConcreteAuth = {
            type: 'oauth2-client-credentials',
            tokenUrl: 't',
            clientId: 'i',
            clientSecret: 's',
            clientAuth: 'basic',
        };
        const code: ConcreteAuth = {
            type: 'oauth2-code-pkce',
            authorizationUrl: 'a',
            tokenUrl: 't',
            clientId: 'i',
        };

        expect(authParts(credentials, {}, 'tok').headers).toEqual([
            ['Authorization', 'Bearer tok'],
        ]);
        expect(authParts(code, {}, 'tok').headers).toEqual([['Authorization', 'Bearer tok']]);
    });

    it('applies nothing for an oauth2 level whose token nobody asked for', () => {
        const auth: ConcreteAuth = {
            type: 'oauth2-code-pkce',
            authorizationUrl: 'a',
            tokenUrl: 't',
            clientId: 'i',
        };

        expect(authParts(auth, {}).headers).toEqual([]);
    });

    it('hands the pair of digest to the send, which answers the challenge with it', () => {
        const parts = authParts(
            { type: 'digest', username: '{{user}}', password: 'p' },
            { 'auth:username': 'ana' },
        );

        expect(parts.headers).toEqual([]);
        expect(parts.signing).toEqual({ scheme: 'digest', username: 'ana', password: 'p' });
    });

    it('hands the keys of aws v4 to the send, the optional fields only when written', () => {
        const bare = authParts(
            { type: 'awsv4', accessKeyId: '{{key}}', secretAccessKey: 's' },
            { 'auth:accessKeyId': 'AK' },
        );
        const full = authParts(
            {
                type: 'awsv4',
                accessKeyId: 'a',
                secretAccessKey: 's',
                region: '{{region}}',
                service: 's3',
                sessionToken: 't',
            },
            { 'auth:region': 'eu-west-1' },
        );

        expect(bare.signing).toEqual({ scheme: 'awsv4', accessKeyId: 'AK', secretAccessKey: 's' });
        expect(full.signing).toEqual({
            scheme: 'awsv4',
            accessKeyId: 'a',
            secretAccessKey: 's',
            region: 'eu-west-1',
            service: 's3',
            sessionToken: 't',
        });
    });

    it('produces nothing for none, and nothing for inherit: the caller decided before', () => {
        const empty = { headers: [], query: [], cookies: [], subprotocols: [] };

        expect(authParts({ type: 'none' }, {})).toEqual(empty);
        expect(authParts({ inherit: true }, {})).toEqual(empty);
    });
});
