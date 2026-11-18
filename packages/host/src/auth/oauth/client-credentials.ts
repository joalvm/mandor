import { clientCredentialsGrantRequest, processClientCredentialsResponse } from 'oauth4webapi';

import type { OAuth2ClientCredentials } from '@mandor/schema';

import {
    authorizationServerOf,
    requestOptionsOf,
    type TokenFetch,
} from './authorization-server-of.js';
import { clientAuthenticationOf } from './client-authentication.js';
import { storedTokenOf, type StoredToken } from './stored-token.js';
import { tokenFailure } from './token-failure.js';

/**
 * Asks the token endpoint for a token with the credentials of the client alone. The level comes
 * resolved: every template already replaced by what it stands for.
 */
export async function requestClientCredentials(
    auth: OAuth2ClientCredentials,
    signal?: AbortSignal,
    fetch?: TokenFetch,
): Promise<StoredToken> {
    try {
        const endpoint = authorizationServerOf({ tokenUrl: auth.tokenUrl });
        const client = { client_id: auth.clientId };
        const response = await clientCredentialsGrantRequest(
            endpoint.server,
            client,
            clientAuthenticationOf(auth),
            parametersOf(auth),
            requestOptionsOf(endpoint, signal, fetch),
        );
        const result = await processClientCredentialsResponse(endpoint.server, client, response);

        return storedTokenOf(result, Date.now());
    } catch (error) {
        throw tokenFailure(error);
    }
}

function parametersOf(auth: OAuth2ClientCredentials): URLSearchParams {
    const parameters = new URLSearchParams();

    if (auth.scope !== undefined) {
        parameters.set('scope', auth.scope);
    }

    if (auth.audience !== undefined) {
        parameters.set('audience', auth.audience);
    }

    return parameters;
}
