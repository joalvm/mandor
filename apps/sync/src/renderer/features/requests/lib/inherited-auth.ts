import type { AuthChainLevel, AuthPlace, ConcreteAuth } from '@mandor/schema';

type SchemeKey =
    | 'none'
    | 'basic'
    | 'bearer'
    | 'apiKey'
    | 'digest'
    | 'awsV4'
    | 'oauth2ClientCredentials'
    | 'oauth2CodePkce';

/** The scheme of a level, as the shared namespace of auth names it. */
const KEY_OF_SCHEME: Record<ConcreteAuth['type'], SchemeKey> = {
    none: 'none',
    basic: 'basic',
    bearer: 'bearer',
    apikey: 'apiKey',
    digest: 'digest',
    awsv4: 'awsV4',
    'oauth2-client-credentials': 'oauth2ClientCredentials',
    'oauth2-code-pkce': 'oauth2CodePkce',
};

/** The level a request that inherits goes out with, and the name of the scheme it carries. */
export type InheritedAuth = { name: string; place: AuthPlace; scheme: SchemeKey };

/**
 * Who rules among the chain: the closest level that carries a scheme instead of inheriting.
 * Null when every level inherits, and the request goes out without auth.
 */
export function inheritedAuth(chain: readonly AuthChainLevel[]): InheritedAuth | null {
    for (const level of chain) {
        if (level.auth !== undefined && 'type' in level.auth) {
            return { name: level.name, place: level.place, scheme: KEY_OF_SCHEME[level.auth.type] };
        }
    }

    return null;
}

/** The folder that rules, when one does: a workspace has no tab to lead to. */
export function rulingFolderOf(owner: InheritedAuth | null): string | null {
    const place = owner?.place;

    return place !== undefined && 'path' in place ? place.path : null;
}
