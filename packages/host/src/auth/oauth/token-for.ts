import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

import { rememberSessionSecrets } from '../../secret/session-secrets.js';
import { AuthTokenError } from '../auth-token-error.js';
import { authorizationServerOf, type TokenFetch } from './authorization-server-of.js';
import { requestClientCredentials } from './client-credentials.js';
import { requestCodePkce } from './code-pkce.js';
import { inFlight } from './in-flight.js';
import { requestRefresh } from './refresh-grant.js';
import type { StoredToken } from './stored-token.js';
import { readToken, writeToken } from './token-cache.js';
import { tokenKeyOfAuth } from './token-key.js';

/** A token that dies within this long is renewed now: it would not outlive the request. */
const RENEW_MARGIN_MS = 30_000;

export type TokenForInput = {
    root: string;
    workspaceId: string;
    /** The environment the send resolved against, which a token never crosses. */
    environmentId: string | null;
    /** The level with every template already resolved. */
    auth: OAuth2ClientCredentials | OAuth2CodePkce;
    /** Opens a url in the browser of the system; a flow that needs the person cannot run without. */
    openExternal?: ((url: string) => Promise<void>) | undefined;
    signal?: AbortSignal | undefined;
    /** The network the token endpoint is reached by: the proxy and certificates of the sends. */
    fetch?: TokenFetch | undefined;
};

/**
 * The token a send applies: the cached one while it is valid, else a renewal with the refresh
 * token, else a new grant. Whatever it hands back is remembered as a secret of the session.
 */
export async function tokenFor(input: TokenForInput): Promise<StoredToken> {
    const { auth } = input;

    // Refuse an endpoint that is not to be trusted before reading anything: a cached token for
    // it would be served over a channel that must not carry one.
    authorizationServerOf({ tokenUrl: auth.tokenUrl });

    const key = tokenKeyOfAuth(auth, input.workspaceId, input.environmentId);
    const cached = await readToken(input.root, key);
    const token =
        cached !== null && isValid(cached.token)
            ? cached.token
            : await inFlight(key, () => renewed(input, key, cached?.token));

    rememberSessionSecrets(
        token.refreshToken === undefined
            ? [token.accessToken]
            : [token.accessToken, token.refreshToken],
    );

    return token;
}

function isValid(token: StoredToken): boolean {
    return token.expiresAt - RENEW_MARGIN_MS > Date.now();
}

async function renewed(
    input: TokenForInput,
    key: string,
    stale: StoredToken | undefined,
): Promise<StoredToken> {
    const token = await refreshedOrGranted(input, stale);

    await writeToken(input.root, key, token);

    return token;
}

/** A refresh token that no longer works is no reason to stop: a new grant may still do. */
async function refreshedOrGranted(
    input: TokenForInput,
    stale: StoredToken | undefined,
): Promise<StoredToken> {
    const refreshed =
        stale?.refreshToken === undefined ? null : await refreshOrNull(input, stale.refreshToken);

    return refreshed ?? grant(input);
}

/** Nothing when the refresh token is refused; a cancellation is not a refusal and goes on up. */
async function refreshOrNull(
    input: TokenForInput,
    refreshToken: string,
): Promise<StoredToken | null> {
    try {
        return await requestRefresh(input.auth, refreshToken, input.signal, input.fetch);
    } catch (error) {
        if (error instanceof AuthTokenError && error.code === 'auth-cancelled') {
            throw error;
        }

        return null;
    }
}

function grant(input: TokenForInput): Promise<StoredToken> {
    if (input.auth.type === 'oauth2-client-credentials') {
        return requestClientCredentials(input.auth, input.signal, input.fetch);
    }

    if (input.openExternal === undefined) {
        return Promise.reject(
            new AuthTokenError('auth-token-failed', 'there is no browser to ask the person in'),
        );
    }

    return requestCodePkce(input.auth, {
        openExternal: input.openExternal,
        signal: input.signal,
        fetch: input.fetch,
    });
}
