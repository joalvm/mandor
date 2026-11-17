import { createHash } from 'node:crypto';

import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

export type TokenKeyInput = {
    flow: 'oauth2-client-credentials' | 'oauth2-code-pkce';
    tokenUrl: string;
    clientId: string;
    scope?: string | undefined;
    audience?: string | undefined;
    workspaceId: string;
    environmentId: string | null;
};

/**
 * The name a token is filed under: a sha256 of every resolved field that makes it a different
 * token, so changing the environment, the client or the scope asks for a new one instead of
 * serving another's. A JSON array keeps two fields from blurring into one at a separator.
 */
export function tokenKey(input: TokenKeyInput): string {
    const fields = [
        input.flow,
        input.tokenUrl,
        input.clientId,
        input.scope ?? '',
        input.audience ?? '',
        input.workspaceId,
        input.environmentId ?? '',
    ];

    return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}

/** Only a client credentials level names an audience; a code flow asks for none. */
function audienceOf(auth: OAuth2ClientCredentials | OAuth2CodePkce): string | undefined {
    if (auth.type === 'oauth2-code-pkce') {
        return undefined;
    }

    return auth.audience;
}

/** The key of the token a resolved level asks for in one workspace and environment. */
export function tokenKeyOfAuth(
    auth: OAuth2ClientCredentials | OAuth2CodePkce,
    workspaceId: string,
    environmentId: string | null,
): string {
    return tokenKey({
        flow: auth.type,
        tokenUrl: auth.tokenUrl,
        clientId: auth.clientId,
        scope: auth.scope,
        audience: audienceOf(auth),
        workspaceId,
        environmentId,
    });
}
