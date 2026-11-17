import {
    chooseByKey,
    loopbackRedirectOf,
    type FormatDocument,
    type KeyHandlers,
} from '@mandor/interop-core';
import type { ConcreteAuth } from '@mandor/schema';

type Pair = readonly [key: string, value: string | undefined];

/** The scheme the way Postman lists it: a type, and under its name the rows of its fields. */
function schemeOf(type: string, pairs: readonly Pair[]): FormatDocument {
    const rows = pairs.flatMap(([key, value]) =>
        value === undefined || value === '' ? [] : [{ key, value, type: 'string' }],
    );

    return { type, [type]: rows };
}

/** What Postman calls the places the secret of a client travels: its header, or the body. */
const CLIENT_AUTHENTICATIONS = { basic: 'header', body: 'body' } as const;

/** One handler per scheme of Mandor: a scheme added to the schema must add its row here. */
const SCHEMES: KeyHandlers<'type', ConcreteAuth, FormatDocument> = {
    none: () => ({ type: 'noauth' }),
    basic: (auth) =>
        schemeOf('basic', [
            ['username', auth.username],
            ['password', auth.password],
        ]),
    bearer: (auth) => schemeOf('bearer', [['token', auth.token]]),
    apikey: (auth) =>
        schemeOf('apikey', [
            ['key', auth.name],
            ['value', auth.value],
            ['in', auth.in],
        ]),
    digest: (auth) =>
        schemeOf('digest', [
            ['username', auth.username],
            ['password', auth.password],
        ]),
    awsv4: (auth) =>
        schemeOf('awsv4', [
            ['accessKey', auth.accessKeyId],
            ['secretKey', auth.secretAccessKey],
            ['region', auth.region],
            ['service', auth.service],
            ['sessionToken', auth.sessionToken],
        ]),
    'oauth2-client-credentials': (auth) =>
        schemeOf('oauth2', [
            ['grant_type', 'client_credentials'],
            ['accessTokenUrl', auth.tokenUrl],
            ['clientId', auth.clientId],
            ['clientSecret', auth.clientSecret],
            ['client_authentication', CLIENT_AUTHENTICATIONS[auth.clientAuth]],
            ['scope', auth.scope],
            ['audience', auth.audience],
        ]),
    'oauth2-code-pkce': (auth) =>
        schemeOf('oauth2', [
            ['grant_type', 'authorization_code_with_pkce'],
            ['authUrl', auth.authorizationUrl],
            ['accessTokenUrl', auth.tokenUrl],
            ['clientId', auth.clientId],
            ['clientSecret', auth.clientSecret],
            ['scope', auth.scope],
            ['redirect_uri', loopbackRedirectOf(auth.redirectPort)],
        ]),
};

/** The auth that decides at one level, as the `auth` of a collection, a folder or a request. */
export function authDocumentOf(auth: ConcreteAuth): FormatDocument {
    return chooseByKey(SCHEMES, auth.type, auth);
}
