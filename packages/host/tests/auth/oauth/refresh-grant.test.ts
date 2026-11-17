import { afterEach, describe, expect, it } from 'vitest';

import { requestRefresh } from '../../../src/auth/oauth/refresh-grant.js';
import { startTokenServer, type FakeTokenServer } from './fake-token-server.js';

let server: FakeTokenServer;

afterEach(async () => {
    await server.close();
});

function auth() {
    return {
        type: 'oauth2-client-credentials' as const,
        tokenUrl: `${server.origin}/token`,
        clientId: 'client',
        clientSecret: 's3cret',
        clientAuth: 'body' as const,
    };
}

describe('requestRefresh', () => {
    it('asks for a refresh_token grant and keeps the refresh token the server did not rotate', async () => {
        server = await startTokenServer(() => ({
            body: { access_token: 'renewed', token_type: 'Bearer', expires_in: 60 },
        }));

        const token = await requestRefresh(auth(), 'the-refresh');

        expect(token).toMatchObject({ accessToken: 'renewed', refreshToken: 'the-refresh' });
        expect(server.requests[0]?.body.get('grant_type')).toBe('refresh_token');
        expect(server.requests[0]?.body.get('refresh_token')).toBe('the-refresh');
    });

    it('fails as a token that did not come when the refresh token is refused', async () => {
        server = await startTokenServer(() => ({ status: 400, body: { error: 'invalid_grant' } }));

        await expect(requestRefresh(auth(), 'revoked')).rejects.toMatchObject({
            code: 'auth-token-failed',
        });
    });
});
