import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { requestClientCredentials } from '../../../src/auth/oauth/client-credentials.js';
import { startTokenServer, type FakeTokenServer } from './fake-token-server.js';

let server: FakeTokenServer;

beforeEach(async () => {
    server = await startTokenServer(() => ({
        body: { access_token: 'fresh', token_type: 'Bearer', expires_in: 60 },
    }));
});

afterEach(async () => {
    await server.close();
});

function auth(over: Partial<Parameters<typeof requestClientCredentials>[0]> = {}) {
    return {
        type: 'oauth2-client-credentials' as const,
        tokenUrl: `${server.origin}/token`,
        clientId: 'client',
        clientSecret: 's3cret',
        clientAuth: 'basic' as const,
        ...over,
    };
}

describe('requestClientCredentials', () => {
    it('asks the token endpoint for a client_credentials grant and returns the token with its expiration', async () => {
        const before = Date.now();
        const token = await requestClientCredentials(auth());

        expect(token.accessToken).toBe('fresh');
        expect(token.expiresAt).toBeGreaterThanOrEqual(before + 60_000);
        expect(server.requests).toHaveLength(1);
        expect(server.requests[0]?.body.get('grant_type')).toBe('client_credentials');
    });

    it('sends the secret in the Basic header when the file says basic, and not in the body', async () => {
        await requestClientCredentials(auth({ clientAuth: 'basic' }));

        const request = server.requests[0];
        const expected = `Basic ${Buffer.from('client:s3cret').toString('base64')}`;

        expect(request?.headers.authorization).toBe(expected);
        expect(request?.body.has('client_secret')).toBe(false);
    });

    it('sends the secret in the body when the file says body, and no Basic header', async () => {
        await requestClientCredentials(auth({ clientAuth: 'body' }));

        const request = server.requests[0];

        expect(request?.body.get('client_id')).toBe('client');
        expect(request?.body.get('client_secret')).toBe('s3cret');
        expect(request?.headers.authorization).toBeUndefined();
    });

    it('sends scope and audience only when the file wrote them', async () => {
        await requestClientCredentials(auth());
        await requestClientCredentials(auth({ scope: 'read write', audience: 'api' }));

        expect(server.requests[0]?.body.has('scope')).toBe(false);
        expect(server.requests[0]?.body.has('audience')).toBe(false);
        expect(server.requests[1]?.body.get('scope')).toBe('read write');
        expect(server.requests[1]?.body.get('audience')).toBe('api');
    });

    it('fails as a token that did not come when the server refuses the client', async () => {
        await server.close();
        server = await startTokenServer(() => ({ status: 401, body: { error: 'invalid_client' } }));

        await expect(requestClientCredentials(auth())).rejects.toMatchObject({
            code: 'auth-token-failed',
        });
    });

    it('does not even ask at a scheme that is not http', async () => {
        await expect(
            requestClientCredentials(auth({ tokenUrl: 'file:///etc/passwd' })),
        ).rejects.toMatchObject({ code: 'auth-token-failed' });
        expect(server.requests).toHaveLength(0);
    });

    it('stops when the caller aborts, and says it was a cancellation', async () => {
        const controller = new AbortController();

        controller.abort();

        await expect(requestClientCredentials(auth(), controller.signal)).rejects.toMatchObject({
            code: 'auth-cancelled',
        });
    });
});
