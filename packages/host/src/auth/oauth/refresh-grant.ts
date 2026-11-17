import { processRefreshTokenResponse, refreshTokenGrantRequest } from 'oauth4webapi';

import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

import {
    authorizationServerOf,
    requestOptionsOf,
    type TokenFetch,
} from './authorization-server-of.js';
import { clientAuthenticationOf } from './client-authentication.js';
import { storedTokenOf, type StoredToken } from './stored-token.js';
import { tokenFailure } from './token-failure.js';

/** Renews a token with the refresh token its last response carried. The level comes resolved. */
export async function requestRefresh(
    auth: OAuth2ClientCredentials | OAuth2CodePkce,
    refreshToken: string,
    signal?: AbortSignal,
    fetch?: TokenFetch,
): Promise<StoredToken> {
    try {
        const endpoint = authorizationServerOf({ tokenUrl: auth.tokenUrl });
        const client = { client_id: auth.clientId };
        const response = await refreshTokenGrantRequest(
            endpoint.server,
            client,
            clientAuthenticationOf(auth),
            refreshToken,
            requestOptionsOf(endpoint, signal, fetch),
        );
        const result = await processRefreshTokenResponse(endpoint.server, client, response);

        return storedTokenOf(result, Date.now(), refreshToken);
    } catch (error) {
        throw tokenFailure(error);
    }
}
