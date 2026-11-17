import {
    allowInsecureRequests,
    type AuthorizationServer,
    customFetch,
    type TokenEndpointRequestOptions,
} from 'oauth4webapi';

import { AuthTokenError } from '../auth-token-error.js';

/** A token endpoint that does not answer in this long is not going to. */
const REQUEST_TIMEOUT_MS = 30_000;

export type OAuthEndpoints = {
    tokenUrl: string;
    authorizationUrl?: string | undefined;
};

/** How a token request reaches its endpoint; without one, the global fetch of the runtime. */
export type TokenFetch = NonNullable<TokenEndpointRequestOptions[typeof customFetch]>;

export type EndpointServer = {
    server: AuthorizationServer;
    /** At least one endpoint is plain http: the library has to be told it may. */
    insecure: boolean;
};

/**
 * Builds the authorization server by hand from what the person wrote — there is no discovery.
 * Plain http is their call, as it is in Postman, Bruno and Insomnia.
 */
export function authorizationServerOf(endpoints: OAuthEndpoints): EndpointServer {
    const token = endpointUrl(endpoints.tokenUrl);
    const authorization =
        endpoints.authorizationUrl === undefined ? null : endpointUrl(endpoints.authorizationUrl);
    const server: AuthorizationServer = {
        issuer: token.origin,
        token_endpoint: token.href,
        ...(authorization === null ? {} : { authorization_endpoint: authorization.href }),
    };

    return {
        server,
        insecure: token.protocol === 'http:' || authorization?.protocol === 'http:',
    };
}

/**
 * The options one token request carries: the abort of the caller, a deadline, the network it
 * goes out by, and the allowance.
 */
export function requestOptionsOf(
    endpoint: EndpointServer,
    signal: AbortSignal | undefined,
    fetch: TokenFetch | undefined,
): TokenEndpointRequestOptions {
    const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

    return {
        signal: signal === undefined ? deadline : AbortSignal.any([signal, deadline]),
        ...(fetch === undefined ? {} : { [customFetch]: fetch }),
        // Deprecated by the library to stand out: it is reached for an endpoint written in http.
        ...(endpoint.insecure ? { [allowInsecureRequests]: true } : {}),
    };
}

/** An endpoint the person wrote, once it is known to be one the web answers: http or https. */
export function endpointUrl(raw: string): URL {
    let url: URL;

    try {
        url = new URL(raw);
    } catch {
        throw new AuthTokenError('auth-token-failed', 'an endpoint is not an absolute url');
    }

    if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url;
    }

    throw new AuthTokenError('auth-token-failed', `an endpoint cannot be ${url.protocol}`);
}
