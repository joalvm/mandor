import {
    type AuthConfig,
    authChainOf,
    type OAuth2ClientCredentials,
    type OAuth2CodePkce,
} from '@mandor/schema';
import { authTemplates, effectiveAuth, resolveTemplates } from '@mandor/vars';

import {
    environmentScope,
    type EnvironmentPlace,
    variableScopeOf,
} from '../../environment/environment-scope.js';
import { resolvedOAuth } from './resolved-oauth.js';

export type OAuthLevelInput = {
    workspaceId: string;
    environmentId: string | null;
    /** The level as the editor holds it, which may not be saved yet. */
    own: AuthConfig | undefined;
    parentPath: string | null;
};

/**
 * The OAuth2 level that rules a place, with its templates resolved against the environment, or
 * null when what rules there is not an OAuth2 scheme and there is no token to speak of.
 */
export async function oauthLevelOf(
    place: EnvironmentPlace,
    input: OAuthLevelInput,
): Promise<OAuth2ClientCredentials | OAuth2CodePkce | null> {
    const scope = await environmentScope(
        place,
        input.workspaceId,
        input.environmentId,
        input.parentPath,
    );
    const chain = authChainOf(scope.chain);
    const { auth, from } = effectiveAuth([input.own, ...chain.map((level) => level.auth)]);

    if (auth.type !== 'oauth2-client-credentials' && auth.type !== 'oauth2-code-pkce') {
        return null;
    }

    // The templates of the level resolve against the chain from that level up: a folder below
    // the one that declares the auth is not where the auth was written.
    const declared = Math.max((from ?? 0) - 1, 0);
    const composed = variableScopeOf({ ...scope, chain: scope.chain.slice(declared) });

    return resolvedOAuth(auth, resolveTemplates(authTemplates(auth), composed).values);
}
