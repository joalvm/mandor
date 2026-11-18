import { concreteAuthSchema, type CollectionItem, type ConcreteAuth } from '@mandor/schema';

import { chooseByKey, type KeyHandlers } from '../choose/choose-by-key.js';
import type { InteropSecurityScheme } from '../ir/interop-document.js';
import { irEqual } from '../ir/ir-equal.js';

/** One auth of the chain as the scheme its shape speaks, or nothing when it speaks none. */
type Schemes = {
    security: Record<string, InteropSecurityScheme>;
    /** The name the auth registered under, or null when no scheme answers for it. */
    nameOf: (auth: ConcreteAuth) => string | null;
};

/**
 * The default of the document as the auth of the workspace speaks it: the scheme it names, or
 * nothing when the workspace decides against auth or its shape no scheme of the document says.
 */
export function defaultSecurityOf(
    auth: ConcreteAuth | undefined,
    nameOf: (auth: ConcreteAuth) => string | null,
): string[] {
    if (auth === undefined || auth.type === 'none') {
        return [];
    }

    const name = nameOf(auth);

    return name === null ? [] : [name];
}

/** The auth the request itself carries, without inheriting: the folder's is registered apart. */
export function ownAuthOf(item: CollectionItem): ConcreteAuth | undefined {
    const auth = concreteAuthSchema.safeParse(item.body['auth']);

    return auth.success ? auth.data : undefined;
}

/**
 * The security of the workspace as the document names it, read off the auth chain in the order
 * the caller walks it — workspace, then folders, then items — so a name reused downstream
 * answers the shape that claimed it first. Only the shape leaves: the values a scheme carries
 * are the person's, and they never travel with the document.
 */
export function schemesOf(auths: readonly ConcreteAuth[]): Schemes {
    const security: Record<string, InteropSecurityScheme> = {};
    const taken = new Map<string, InteropSecurityScheme>();

    const nameOf = (auth: ConcreteAuth): string | null => {
        const scheme = schemeOf(auth);

        if (scheme === null) {
            return null;
        }

        const named = [...taken.entries()].find(([, other]) => irEqual(other, scheme));

        if (named !== undefined) {
            return named[0];
        }

        let name = baseNameOf(auth);
        let suffix = 2;

        while (taken.has(name)) {
            name = `${baseNameOf(auth)}${String(suffix)}`;
            suffix += 1;
        }

        taken.set(name, scheme);
        security[name] = scheme;

        return name;
    };

    for (const auth of auths) {
        nameOf(auth);
    }

    return { security, nameOf };
}

/** Where an api key travels that no scheme of the document reaches. */
const OUTSIDE_THE_DOCUMENT: ReadonlySet<string> = new Set(['subprotocol']);

const SCHEMES: KeyHandlers<'type', ConcreteAuth, InteropSecurityScheme | null> = {
    basic: () => ({ type: 'http', extras: { scheme: 'basic' } }),
    bearer: () => ({ type: 'http', extras: { scheme: 'bearer' } }),
    // The key a subprotocol carries lives outside OpenAPI's reach: no scheme says it.
    apikey: (auth) =>
        OUTSIDE_THE_DOCUMENT.has(auth.in)
            ? null
            : { type: 'apiKey', extras: { name: auth.name, in: auth.in } },
    digest: () => ({ type: 'http', extras: { scheme: 'digest' } }),
    // An AWS signature has no scheme in OpenAPI: only vendor extensions speak it.
    awsv4: () => null,
    'oauth2-client-credentials': (auth) => ({
        type: 'oauth2',
        extras: {
            flows: {
                clientCredentials: { tokenUrl: auth.tokenUrl, scopes: scopesOf(auth.scope) },
            },
        },
    }),
    'oauth2-code-pkce': (auth) => ({
        type: 'oauth2',
        extras: {
            flows: {
                authorizationCode: {
                    authorizationUrl: auth.authorizationUrl,
                    tokenUrl: auth.tokenUrl,
                    scopes: scopesOf(auth.scope),
                },
            },
        },
    }),
    none: () => null,
};

function schemeOf(auth: ConcreteAuth): InteropSecurityScheme | null {
    return chooseByKey(SCHEMES, auth.type, auth);
}

/** One word of the scope, one scope of the flow, kept empty: the names are the document's. */
function scopesOf(scope: string | undefined): Record<string, string> {
    return Object.fromEntries(
        (scope ?? '')
            .split(' ')
            .filter((word) => word !== '')
            .map((word) => [word, '']),
    );
}

/** The name each shape registers under, before a clash adds a number. */
const BASE_NAMES: Record<ConcreteAuth['type'], string> = {
    basic: 'basicAuth',
    bearer: 'bearerAuth',
    apikey: 'apiKeyAuth',
    digest: 'digestAuth',
    awsv4: 'awsSigV4',
    'oauth2-client-credentials': 'oauth2ClientCredentials',
    'oauth2-code-pkce': 'oauth2AuthorizationCode',
    none: 'noAuth',
};

function baseNameOf(auth: ConcreteAuth): string {
    return BASE_NAMES[auth.type];
}
