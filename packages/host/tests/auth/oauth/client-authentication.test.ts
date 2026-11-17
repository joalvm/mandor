import { describe, expect, it } from 'vitest';

import { clientAuthenticationOf } from '../../../src/auth/oauth/client-authentication.js';

const SERVER = { issuer: 'https://idp.example', token_endpoint: 'https://idp.example/token' };
const CLIENT = { client_id: 'client' };

async function apply(auth: Parameters<typeof clientAuthenticationOf>[0]) {
    const body = new URLSearchParams();
    const headers = new Headers();

    await clientAuthenticationOf(auth)(SERVER, CLIENT, body, headers);

    return { body, headers };
}

const CODE = {
    type: 'oauth2-code-pkce' as const,
    authorizationUrl: 'a',
    tokenUrl: 't',
    clientId: 'client',
};

describe('clientAuthenticationOf', () => {
    it('puts the secret of a client credentials level in the Basic header when it says basic', async () => {
        const { body, headers } = await apply({
            type: 'oauth2-client-credentials',
            tokenUrl: 't',
            clientId: 'client',
            clientSecret: 's3cret',
            clientAuth: 'basic',
        });

        expect(headers.get('authorization')).toBe(`Basic ${btoa('client:s3cret')}`);
        expect(body.has('client_secret')).toBe(false);
    });

    it('puts it in the body when the level says body', async () => {
        const { body, headers } = await apply({
            type: 'oauth2-client-credentials',
            tokenUrl: 't',
            clientId: 'client',
            clientSecret: 's3cret',
            clientAuth: 'body',
        });

        expect(body.get('client_secret')).toBe('s3cret');
        expect(headers.has('authorization')).toBe(false);
    });

    it('proves nothing for a code flow without a secret: a public client', async () => {
        for (const clientSecret of [undefined, '']) {
            const { body, headers } = await apply({ ...CODE, clientSecret });

            expect(body.get('client_id')).toBe('client');
            expect(body.has('client_secret')).toBe(false);
            expect(headers.has('authorization')).toBe(false);
        }
    });

    it('uses the Basic header for a code flow that has a secret', async () => {
        const { headers } = await apply({ ...CODE, clientSecret: 's3cret' });

        expect(headers.get('authorization')).toBe(`Basic ${btoa('client:s3cret')}`);
    });
});
