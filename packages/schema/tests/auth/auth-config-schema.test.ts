import { describe, expect, it } from 'vitest';

import { API_KEY_PLACEMENTS } from '../../src/auth/api-key-placement.js';
import { authConfigSchema } from '../../src/auth/auth-config-schema.js';

describe('authConfigSchema', () => {
    it('reads inherit as one shape that carries nothing else', () => {
        expect(authConfigSchema.parse({ inherit: true })).toEqual({ inherit: true });
    });

    it('reads none without extra keys', () => {
        expect(authConfigSchema.parse({ type: 'none' })).toEqual({ type: 'none' });
    });

    it('reads basic with its two credentials, both template-ready', () => {
        const auth = { type: 'basic', username: '{{user}}', password: '{{password}}' };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('reads bearer without a prefix as the plain token', () => {
        const auth = { type: 'bearer', token: '{{token}}' };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('reads bearer with a prefix the file wrote', () => {
        const auth = { type: 'bearer', token: 'abc', prefix: 'Token' };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('reads an api key in every placement the schema knows', () => {
        for (const placement of API_KEY_PLACEMENTS) {
            const auth = { type: 'apikey', name: 'X-Key', value: '{{key}}', in: placement };

            expect(authConfigSchema.parse(auth)).toEqual(auth);
        }
    });

    it('refuses an api key name that is empty, spaced or coloned: it travels as a key', () => {
        for (const name of ['', 'X Key', 'X:Key']) {
            expect(() =>
                authConfigSchema.parse({ type: 'apikey', name, value: 'k', in: 'header' }),
            ).toThrow();
        }
    });

    it('reads digest with the pair the challenge is answered with', () => {
        const auth = { type: 'digest', username: '{{user}}', password: '{{password}}' };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('reads aws signature v4 with its keys, and region, service and session token when written', () => {
        const bare = { type: 'awsv4', accessKeyId: '{{key}}', secretAccessKey: '{{secret}}' };
        const full = { ...bare, region: 'eu-west-1', service: 's3', sessionToken: '{{session}}' };

        expect(authConfigSchema.parse(bare)).toEqual(bare);
        expect(authConfigSchema.parse(full)).toEqual(full);
    });

    it('reads client credentials with the fields of the token request', () => {
        const auth = {
            type: 'oauth2-client-credentials',
            tokenUrl: '{{base}}/token',
            clientId: '{{id}}',
            clientSecret: '{{secret}}',
            clientAuth: 'basic',
            scope: 'read write',
            audience: 'api',
        };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('reads client credentials without scope or audience', () => {
        const auth = {
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://idp.test/token',
            clientId: 'id',
            clientSecret: 's',
            clientAuth: 'body',
        };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('refuses a client authentication the token endpoint cannot be asked for', () => {
        expect(() =>
            authConfigSchema.parse({
                type: 'oauth2-client-credentials',
                tokenUrl: 't',
                clientId: 'i',
                clientSecret: 's',
                clientAuth: 'jwt',
            }),
        ).toThrow();
    });

    it('reads code with pkce as a public client when the secret is absent', () => {
        const auth = {
            type: 'oauth2-code-pkce',
            authorizationUrl: 'https://idp.test/authorize',
            tokenUrl: 'https://idp.test/token',
            clientId: 'id',
            scope: 'openid',
            redirectPort: 8123,
        };

        expect(authConfigSchema.parse(auth)).toEqual(auth);
    });

    it('refuses a redirect port outside 1024-65535 or with decimals', () => {
        for (const redirectPort of [80, 1023, 65536, 8080.5]) {
            expect(() =>
                authConfigSchema.parse({
                    type: 'oauth2-code-pkce',
                    authorizationUrl: 'a',
                    tokenUrl: 't',
                    clientId: 'i',
                    redirectPort,
                }),
            ).toThrow();
        }
    });

    it('refuses a placement the schema does not know', () => {
        expect(() =>
            authConfigSchema.parse({ type: 'apikey', name: 'X-Key', value: 'k', in: 'body' }),
        ).toThrow();
    });

    it('refuses keys the shape does not name: a reader never invents fields', () => {
        expect(() => authConfigSchema.parse({ type: 'none', extra: 1 })).toThrow();
        expect(() => authConfigSchema.parse({ inherit: true, type: 'none' })).toThrow();
    });

    it('refuses a type that is not one of the auth kinds', () => {
        expect(() => authConfigSchema.parse({ type: 'oauth2' })).toThrow();
    });
});
