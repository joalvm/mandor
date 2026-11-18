import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { requestCodePkce } from '../../../src/auth/oauth/code-pkce.js';
import { startTokenServer, type FakeTokenServer } from './fake-token-server.js';

let server: FakeTokenServer;
let opened: URL[];

beforeEach(async () => {
    opened = [];
    server = await startTokenServer(() => ({
        body: {
            access_token: 'granted',
            token_type: 'Bearer',
            expires_in: 60,
            refresh_token: 'the-refresh',
        },
    }));
});

afterEach(async () => {
    await server.close();
});

function auth(over: Record<string, unknown> = {}) {
    return {
        type: 'oauth2-code-pkce' as const,
        authorizationUrl: `${server.origin}/authorize`,
        tokenUrl: `${server.origin}/token`,
        clientId: 'client',
        scope: 'read',
        ...over,
    };
}

/** The browser of a person who accepts: the provider sends them back to the loopback. */
function approving(overrides: { state?: string; code?: string } = {}) {
    return async (raw: string): Promise<void> => {
        const url = new URL(raw);
        const back = new URL(url.searchParams.get('redirect_uri') ?? '');

        opened.push(url);
        back.searchParams.set('code', overrides.code ?? 'the-code');
        back.searchParams.set('state', overrides.state ?? url.searchParams.get('state') ?? '');

        await fetch(back);
    };
}

// Below the range the system hands out for port 0: a test running beside this one, asking for any
// port, cannot be given it between the moment it is chosen and the moment it is taken.
const ASKED_PORT = 28431;

describe('requestCodePkce', () => {
    it('opens the system browser at the authorization url and trades the code for a token', async () => {
        const token = await requestCodePkce(auth(), { openExternal: approving() });
        const url = opened[0];

        expect(token.accessToken).toBe('granted');
        expect(token.refreshToken).toBe('the-refresh');
        expect(`${url?.origin ?? ''}${url?.pathname ?? ''}`).toBe(`${server.origin}/authorize`);
        expect(url?.searchParams.get('response_type')).toBe('code');
        expect(url?.searchParams.get('code_challenge_method')).toBe('S256');
        expect(url?.searchParams.get('scope')).toBe('read');
    });

    it('proves the verifier it hashed into the challenge, and the redirect it announced', async () => {
        await requestCodePkce(auth(), { openExternal: approving() });

        const request = server.requests[0];
        const verifier = request?.body.get('code_verifier') ?? '';
        const challenge = createHash('sha256').update(verifier).digest('base64url');

        expect(request?.body.get('grant_type')).toBe('authorization_code');
        expect(request?.body.get('code')).toBe('the-code');
        expect(challenge).toBe(opened[0]?.searchParams.get('code_challenge'));
        expect(request?.body.get('redirect_uri')).toBe(opened[0]?.searchParams.get('redirect_uri'));
        expect(request?.body.get('client_id')).toBe('client');
    });

    it('uses a public client when there is no secret, and Basic when there is one', async () => {
        await requestCodePkce(auth(), { openExternal: approving() });
        await requestCodePkce(auth({ clientSecret: 's3cret' }), { openExternal: approving() });

        expect(server.requests[0]?.headers.authorization).toBeUndefined();
        expect(server.requests[1]?.headers.authorization).toBe(
            `Basic ${Buffer.from('client:s3cret').toString('base64')}`,
        );
    });

    it('listens on the port the file asks for', async () => {
        await requestCodePkce(auth({ redirectPort: ASKED_PORT }), { openExternal: approving() });

        expect(new URL(opened[0]?.searchParams.get('redirect_uri') ?? '').port).toBe(
            String(ASKED_PORT),
        );
    });

    it('does not take a callback whose state is not the one it sent: the wait goes on', async () => {
        await expect(
            requestCodePkce(auth(), {
                openExternal: approving({ state: 'forged' }),
                timeoutMs: 200,
            }),
        ).rejects.toMatchObject({ code: 'auth-cancelled' });
        expect(server.requests).toHaveLength(0);
    });

    it('fails when the provider answers with an error instead of a code', async () => {
        const denied = async (raw: string): Promise<void> => {
            const url = new URL(raw);
            const back = new URL(url.searchParams.get('redirect_uri') ?? '');

            back.searchParams.set('error', 'access_denied');
            back.searchParams.set('state', url.searchParams.get('state') ?? '');
            await fetch(back);
        };

        await expect(requestCodePkce(auth(), { openExternal: denied })).rejects.toMatchObject({
            code: 'auth-token-failed',
        });
        expect(server.requests).toHaveLength(0);
    });

    it('is cancelled when nobody comes back in time', async () => {
        await expect(
            requestCodePkce(auth(), { openExternal: () => Promise.resolve(), timeoutMs: 30 }),
        ).rejects.toMatchObject({ code: 'auth-cancelled' });
    });

    it('is cancelled when the caller aborts while the browser is open', async () => {
        const controller = new AbortController();
        const flow = requestCodePkce(auth(), {
            openExternal: () => {
                controller.abort();

                return Promise.resolve();
            },
            signal: controller.signal,
        });

        await expect(flow).rejects.toMatchObject({ code: 'auth-cancelled' });
    });

    it('fails as a token that did not come when the browser cannot be opened', async () => {
        await expect(
            requestCodePkce(auth(), {
                openExternal: () => Promise.reject(new Error('no browser')),
            }),
        ).rejects.toMatchObject({ code: 'auth-token-failed' });
    });

    it('refuses an authorization endpoint that is not http before opening anything', async () => {
        await expect(
            requestCodePkce(auth({ authorizationUrl: 'file:///etc/passwd' }), {
                openExternal: approving(),
            }),
        ).rejects.toMatchObject({ code: 'auth-token-failed' });
        expect(opened).toHaveLength(0);
    });
});
