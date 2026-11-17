import { ClientSecretBasic, ClientSecretPost, None, type ClientAuth } from 'oauth4webapi';

import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

/** Where the secret of a client credentials level travels: the Basic header, or the body. */
const SECRET_CARRIERS: Readonly<
    Record<OAuth2ClientCredentials['clientAuth'], (secret: string) => ClientAuth>
> = {
    basic: ClientSecretBasic,
    body: ClientSecretPost,
};

/**
 * How the client proves itself at the token endpoint. A client credentials level says where its
 * secret travels; a code flow with a secret uses the Basic header the standard defaults to, and
 * one without a secret is a public client that proves nothing.
 */
export function clientAuthenticationOf(auth: OAuth2ClientCredentials | OAuth2CodePkce): ClientAuth {
    if (auth.type === 'oauth2-code-pkce') {
        return auth.clientSecret === undefined || auth.clientSecret === ''
            ? None()
            : ClientSecretBasic(auth.clientSecret);
    }

    return SECRET_CARRIERS[auth.clientAuth](auth.clientSecret);
}
