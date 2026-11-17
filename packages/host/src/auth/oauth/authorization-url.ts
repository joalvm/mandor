import { endpointUrl } from './authorization-server-of.js';

export type AuthorizationUrlInput = {
    authorizationUrl: string;
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
    scope?: string | undefined;
};

/**
 * Where the browser goes to ask the person for consent: the endpoint of the provider with the
 * parameters of a code flow protected by PKCE. Anything but https, or http on loopback, is refused
 * before the browser is asked to open it.
 */
export function authorizationUrlOf(input: AuthorizationUrlInput): URL {
    const url = endpointUrl(input.authorizationUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', input.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);

    if (input.scope !== undefined) {
        url.searchParams.set('scope', input.scope);
    }

    url.searchParams.set('state', input.state);
    url.searchParams.set('code_challenge', input.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url;
}
