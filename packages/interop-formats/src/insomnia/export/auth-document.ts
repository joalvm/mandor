import {
    chooseByKey,
    loopbackRedirectOf,
    SUBPROTOCOL_HEADER,
    withoutEmpty,
    type FormatDocument,
    type KeyHandlers,
} from '@mandor/interop-core';
import type { ApiKeyPlacement, ConcreteAuth } from '@mandor/schema';

/** Where Insomnia lets a key travel. A subprotocol is the header its value is sent in. */
const PLACES: Record<ApiKeyPlacement, { addTo: string; key?: string }> = {
    header: { addTo: 'header' },
    query: { addTo: 'queryParams' },
    cookie: { addTo: 'cookie' },
    subprotocol: { addTo: 'header', key: SUBPROTOCOL_HEADER },
};

/** One handler per scheme of Mandor: a scheme added to the schema must add its row here. */
const SCHEMES: KeyHandlers<'type', ConcreteAuth, FormatDocument> = {
    none: () => ({ type: 'none' }),
    basic: (auth) => ({
        type: 'basic',
        username: auth.username,
        password: auth.password,
    }),
    bearer: (auth) =>
        withoutEmpty({
            type: 'bearer',
            token: auth.token,
            prefix: auth.prefix,
        }),
    apikey: (auth) => ({
        type: 'apikey',
        key: PLACES[auth.in].key ?? auth.name,
        value: auth.value,
        addTo: PLACES[auth.in].addTo,
    }),
    digest: (auth) => ({
        type: 'digest',
        username: auth.username,
        password: auth.password,
    }),
    awsv4: (auth) =>
        withoutEmpty({
            type: 'iam',
            accessKeyId: auth.accessKeyId,
            secretAccessKey: auth.secretAccessKey,
            sessionToken: auth.sessionToken,
            region: auth.region,
            service: auth.service,
        }),
    'oauth2-client-credentials': (auth) =>
        withoutEmpty({
            type: 'oauth2',
            grantType: 'client_credentials',
            accessTokenUrl: auth.tokenUrl,
            clientId: auth.clientId,
            clientSecret: auth.clientSecret,
            credentialsInBody: auth.clientAuth === 'body',
            scope: auth.scope,
            audience: auth.audience,
        }),
    'oauth2-code-pkce': (auth) =>
        withoutEmpty({
            type: 'oauth2',
            grantType: 'authorization_code',
            usePkce: true,
            authorizationUrl: auth.authorizationUrl,
            accessTokenUrl: auth.tokenUrl,
            clientId: auth.clientId,
            clientSecret: auth.clientSecret,
            scope: auth.scope,
            redirectUrl: loopbackRedirectOf(auth.redirectPort),
        }),
};

/** The auth that decides at one level, as the `authentication` of a folder or a request. */
export function authDocumentOf(auth: ConcreteAuth): FormatDocument {
    return chooseByKey(SCHEMES, auth.type, auth);
}
