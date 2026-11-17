import {
    type AuthDraft,
    type AuthResult,
    type AuthSubject,
    checkedAuth,
    degradation,
    type Degradation,
    type InteropSecurityScheme,
    loopbackPortOf,
    optionalField,
} from '@mandor/interop-core';

import { textOf } from './text-of.js';

type Extras = Record<string, unknown>;

/** Where an api key travels, as Mandor holds it; anything else written is the header. */
const API_KEY_PLACES = ['header', 'query'] as const;

/** How the client authenticates against the token url; anything else written is `basic`. */
const CLIENT_AUTHS = ['basic', 'body'] as const;

const BUILDERS = new Map<string, (extras: Extras, type: string) => AuthDraft | undefined>([
    ['basic', basic],
    ['bearer', bearer],
    ['apikey', apikey],
    ['oauth2', oauth2],
]);

/**
 * The auth Mandor holds for a scheme of Postman. What cannot be held says why, and the level
 * enters with no auth: a request or a folder says `none` so it does not inherit one it was never
 * meant to send, the workspace has none. A secret written in the document does not enter.
 */
export function authConfigOf(scheme: InteropSecurityScheme, subject: AuthSubject): AuthResult {
    return checkedAuth(
        BUILDERS.get(scheme.type)?.(scheme.extras, scheme.type),
        scheme.type,
        subject,
    );
}

function basic(extras: Extras, type: string): AuthDraft {
    const password = textOf(extras['password']);

    return { auth: { type, username: textOf(extras['username']), password }, degradations: [] };
}

function bearer(extras: Extras, type: string): AuthDraft {
    const token = textOf(extras['token']);

    return { auth: { type, token }, degradations: [] };
}

function apikey(extras: Extras, type: string): AuthDraft {
    const value = textOf(extras['value']);
    const written = textOf(extras['in']);
    const where = API_KEY_PLACES.find((place) => place === written) ?? 'header';

    return { auth: { type, name: textOf(extras['key']), value, in: where }, degradations: [] };
}

function oauth2(extras: Extras): AuthDraft | undefined {
    const grant = textOf(extras['grant_type']);

    if (grant === 'client_credentials') {
        return clientCredentials(extras);
    }

    const flows = ['authorization_code_with_pkce', 'authorization_code', ''];

    return flows.includes(grant) ? codeFlow(extras, grant) : undefined;
}

function clientAuthOf(written: string): (typeof CLIENT_AUTHS)[number] {
    return CLIENT_AUTHS.find((clientAuth) => clientAuth === written) ?? 'basic';
}

function clientCredentials(extras: Extras): AuthDraft {
    const clientSecret = textOf(extras['clientSecret']);

    return {
        auth: {
            type: 'oauth2-client-credentials',
            tokenUrl: textOf(extras['accessTokenUrl']),
            clientId: textOf(extras['clientId']),
            clientSecret,
            clientAuth: clientAuthOf(textOf(extras['client_authentication'])),
            ...optionalField('scope', textOf(extras['scope'])),
            ...optionalField('audience', textOf(extras['audience'])),
        },
        degradations: [],
    };
}

function codeFlow(extras: Extras, grant: string): AuthDraft {
    const degradations: Degradation[] = [];
    const clientSecret = textOf(extras['clientSecret']);
    const audience = textOf(extras['audience']);
    const port = loopbackPortOf(textOf(extras['redirect_uri']), degradations, 'URI');

    if (audience !== '') {
        degradations.push(degradation('audienceNotKept', { audience }));
    }

    if (grant !== 'authorization_code_with_pkce') {
        degradations.push(degradation('pkceAlways'));
    }

    return {
        auth: {
            type: 'oauth2-code-pkce',
            authorizationUrl: textOf(extras['authUrl']),
            tokenUrl: textOf(extras['accessTokenUrl']),
            clientId: textOf(extras['clientId']),
            ...optionalField('clientSecret', clientSecret),
            ...optionalField('scope', textOf(extras['scope'])),
            ...(port === undefined ? {} : { redirectPort: port }),
        },
        degradations,
    };
}
