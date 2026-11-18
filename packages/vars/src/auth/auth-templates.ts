import type { AuthConfig, ConcreteAuth } from '@mandor/schema';

/**
 * The fields of the scheme as templates keyed `auth:<field>`, ready for `resolveTemplates`
 * next to the request's own ones. The `auth:` prefix keeps them from colliding with the
 * `header:<i>` keys of the request. Inherit carries no template of its own: the level that
 * decided has already been picked when these are built.
 */
export function authTemplates(auth: AuthConfig): Record<string, string> {
    if (!('type' in auth)) {
        return {};
    }

    return templatesBy(auth.type, auth);
}

/** The type and the level travel apart, so the compiler pairs the entry with its own level. */
function templatesBy<Type extends ConcreteAuth['type']>(
    type: Type,
    auth: Extract<ConcreteAuth, { type: Type }>,
): Record<string, string> {
    return TEMPLATES_OF_SCHEME[type](auth);
}

type TemplatesOf<Type extends ConcreteAuth['type']> = (
    auth: Extract<ConcreteAuth, { type: Type }>,
) => Record<string, string>;

/** The user and the password, which Basic encodes and Digest hashes. */
function userTemplates(auth: { username: string; password: string }): Record<string, string> {
    return { 'auth:username': auth.username, 'auth:password': auth.password };
}

/** One entry per scheme, chosen by the type the level carries. None carries no field. */
const TEMPLATES_OF_SCHEME: { [Type in ConcreteAuth['type']]: TemplatesOf<Type> } = {
    none: () => ({}),
    basic: userTemplates,
    bearer: (auth) => withOptional({ 'auth:token': auth.token }, { 'auth:prefix': auth.prefix }),
    apikey: (auth) => ({ 'auth:name': auth.name, 'auth:value': auth.value }),
    digest: userTemplates,
    awsv4: (auth) =>
        withOptional(
            { 'auth:accessKeyId': auth.accessKeyId, 'auth:secretAccessKey': auth.secretAccessKey },
            {
                'auth:region': auth.region,
                'auth:service': auth.service,
                'auth:sessionToken': auth.sessionToken,
            },
        ),
    'oauth2-client-credentials': (auth) =>
        withOptional(
            {
                'auth:tokenUrl': auth.tokenUrl,
                'auth:clientId': auth.clientId,
                'auth:clientSecret': auth.clientSecret,
            },
            { 'auth:scope': auth.scope, 'auth:audience': auth.audience },
        ),
    'oauth2-code-pkce': (auth) =>
        withOptional(
            {
                'auth:authorizationUrl': auth.authorizationUrl,
                'auth:tokenUrl': auth.tokenUrl,
                'auth:clientId': auth.clientId,
            },
            { 'auth:clientSecret': auth.clientSecret, 'auth:scope': auth.scope },
        ),
};

/** The fields a file may leave out enter only when somebody wrote them. */
function withOptional(
    required: Record<string, string>,
    optional: Record<string, string | undefined>,
): Record<string, string> {
    const written = Object.entries(optional).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
    );

    return { ...required, ...Object.fromEntries(written) };
}
