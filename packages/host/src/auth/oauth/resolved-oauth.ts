import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

type OAuth2Auth = OAuth2ClientCredentials | OAuth2CodePkce;

/** The fields of an OAuth2 level that hold text a variable may stand in for. */
const TEXT_FIELDS = [
    'tokenUrl',
    'authorizationUrl',
    'clientId',
    'clientSecret',
    'scope',
    'audience',
] as const;

/**
 * The level with its templates replaced by what they resolved to — `values` is what
 * `resolveTemplates` produced for `authTemplates`. What the file did not write stays absent.
 */
export function resolvedOAuth<T extends OAuth2Auth>(auth: T, values: Record<string, string>): T {
    const written: Record<string, unknown> = auth;
    const swapped = TEXT_FIELDS.flatMap((field): [string, string][] => {
        const value = values[`auth:${field}`];

        return typeof written[field] === 'string' && value !== undefined ? [[field, value]] : [];
    });

    return { ...auth, ...Object.fromEntries(swapped) };
}
