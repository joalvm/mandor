import {
    chooseByKey,
    loopbackRedirectOf,
    SUBPROTOCOL_HEADER,
    withoutEmpty,
    type FormatDocument,
    type KeyHandlers,
} from '@mandor/interop-core';
import type { ApiKeyPlacement, ConcreteAuth } from '@mandor/schema';

/**
 * Where Bruno lets a key travel: the header or the query. A cookie and a subprotocol are the
 * headers that carry them, so what is sent is the same.
 */
const PLACES: Record<ApiKeyPlacement, (key: string, value: string) => FormatDocument> = {
    header: (key, value) => ({ key, value, placement: 'header' }),
    query: (key, value) => ({ key, value, placement: 'query' }),
    cookie: (key, value) => ({ key: 'Cookie', value: `${key}=${value}`, placement: 'header' }),
    subprotocol: (_key, value) => ({ key: SUBPROTOCOL_HEADER, value, placement: 'header' }),
};

/** How the client proves itself to the token endpoint, by the name Bruno gives each way. */
const CLIENT_AUTH: Record<'basic' | 'body', string> = {
    basic: 'basic_auth_header',
    body: 'body',
};

/** The client of an oauth2 flow: the id and the secret, which only leaves as a reference. */
function credentialsOf(
    clientId: string,
    clientSecret: string | undefined,
    placement: string | undefined,
): FormatDocument {
    return withoutEmpty({
        clientId,
        clientSecret: clientSecret,
        placement,
    });
}

/** The audience has no field in Bruno: it travels as an extra parameter of the token request. */
function audienceOf(audience: string | undefined): FormatDocument {
    if (audience === undefined || audience === '') {
        return {};
    }

    return {
        additionalParameters: {
            accessTokenRequest: [{ name: 'audience', value: audience, placement: 'body' }],
        },
    };
}

/** One handler per scheme of Mandor: a scheme added to the schema must add its row here. */
const SCHEMES: KeyHandlers<'type', ConcreteAuth, FormatDocument | undefined> = {
    none: () => undefined,
    basic: (auth) => ({
        type: 'basic',
        username: auth.username,
        password: auth.password,
    }),
    bearer: (auth) => ({ type: 'bearer', token: auth.token }),
    apikey: (auth) => ({
        type: 'apikey',
        ...PLACES[auth.in](auth.name, auth.value),
    }),
    digest: (auth) => ({
        type: 'digest',
        username: auth.username,
        password: auth.password,
    }),
    awsv4: (auth) =>
        withoutEmpty({
            type: 'awsv4',
            accessKeyId: auth.accessKeyId,
            secretAccessKey: auth.secretAccessKey,
            sessionToken: auth.sessionToken,
            service: auth.service,
            region: auth.region,
        }),
    'oauth2-client-credentials': (auth) => ({
        type: 'oauth2',
        flow: 'client_credentials',
        accessTokenUrl: auth.tokenUrl,
        credentials: credentialsOf(auth.clientId, auth.clientSecret, CLIENT_AUTH[auth.clientAuth]),
        ...withoutEmpty({ scope: auth.scope }),
        ...audienceOf(auth.audience),
    }),
    'oauth2-code-pkce': (auth) => ({
        type: 'oauth2',
        flow: 'authorization_code',
        authorizationUrl: auth.authorizationUrl,
        accessTokenUrl: auth.tokenUrl,
        ...withoutEmpty({ callbackUrl: loopbackRedirectOf(auth.redirectPort), scope: auth.scope }),
        credentials: credentialsOf(auth.clientId, auth.clientSecret, undefined),
        pkce: { method: 'S256' },
    }),
};

/**
 * The auth that decides at one level, as the `auth` of a request, a folder or the collection.
 * Bruno has no scheme for no auth, so a level that stops the inheritance gives no document.
 */
export function authDocumentOf(auth: ConcreteAuth): FormatDocument | undefined {
    return chooseByKey(SCHEMES, auth.type, auth);
}

/**
 * The `auth` entry of a request or a folder. One that speaks no auth inherits, which Bruno calls
 * `inherit` and does not guess: a level with no entry is a level with none.
 */
export function authEntryOf(auth: ConcreteAuth | undefined): FormatDocument {
    if (auth === undefined) {
        return { auth: 'inherit' };
    }

    const document = authDocumentOf(auth);

    return document === undefined ? {} : { auth: document };
}
