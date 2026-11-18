import {
    type AuthDraft,
    type AuthResult,
    type AuthSubject,
    checkedAuth,
    clientCredentialsDraft,
    codeFlowDraft,
    textOf,
} from '@mandor/interop-core';

import type { BrunoAuth } from '../document/bruno-tree.js';

type Builder = (fields: BrunoAuth, type: string) => AuthDraft | undefined;

const BUILDERS = new Map<string, Builder>([
    ['basic', basic],
    ['bearer', bearer],
    ['apikey', apikey],
    ['oauth2', oauth2],
]);

/** The schemes that carry no fields: nothing written and `inherit` inherit, `none` stops it. */
const FIXED = new Map<string, AuthResult['auth']>([
    ['', undefined],
    ['inherit', undefined],
    ['none', { type: 'none' }],
]);

/** Where an API key goes when the document does not say `query`. */
const KEY_PLACES = new Map<string, 'header' | 'query'>([['query', 'query']]);

/** How the client is told apart when the document does not say `body`. */
const CLIENT_AUTHS = new Map<string, 'basic' | 'body'>([['body', 'body']]);

/**
 * The auth Mandor holds for what a request, a folder or a collection of Bruno asks. Nothing
 * written and `inherit` both inherit, so no auth is left to write; `none` stops the inheritance.
 * What cannot be held says why, and the level enters with no auth: it says `none` so it does
 * not send one it was never meant to. A secret written in the document does not enter.
 */
export function authOf(auth: BrunoAuth | undefined, subject: AuthSubject): AuthResult {
    if (auth === undefined) {
        return { auth: undefined, degradations: [] };
    }

    const type = textOf(auth['type']);

    if (FIXED.has(type)) {
        return { auth: FIXED.get(type), degradations: [] };
    }

    return checkedAuth(BUILDERS.get(type)?.(auth, type), type, subject);
}

function basic(fields: BrunoAuth, type: string): AuthDraft {
    const password = textOf(fields['password']);

    return { auth: { type, username: textOf(fields['username']), password }, degradations: [] };
}

function bearer(fields: BrunoAuth, type: string): AuthDraft {
    const token = textOf(fields['token']);

    return { auth: { type, token }, degradations: [] };
}

function apikey(fields: BrunoAuth, type: string): AuthDraft {
    const value = textOf(fields['value']);
    const where = KEY_PLACES.get(textOf(fields['placement'])) ?? 'header';

    return { auth: { type, name: textOf(fields['key']), value, in: where }, degradations: [] };
}

/** The flows of oauth2 that Mandor holds, by the name OpenCollection gives them. */
const FLOWS = new Map<string, Builder>([
    ['client_credentials', clientCredentials],
    ['authorization_code', codeFlow],
]);

function oauth2(fields: BrunoAuth, type: string): AuthDraft | undefined {
    return FLOWS.get(textOf(fields['flow']))?.(fields, type);
}

function clientCredentials(fields: BrunoAuth): AuthDraft {
    return clientCredentialsDraft({
        tokenUrl: textOf(fields['accessTokenUrl']),
        clientId: textOf(fields['clientId']),
        clientSecret: textOf(fields['clientSecret']),
        clientAuth: CLIENT_AUTHS.get(textOf(fields['placement'])) ?? 'basic',
        scope: textOf(fields['scope']),
    });
}

function codeFlow(fields: BrunoAuth): AuthDraft {
    return codeFlowDraft({
        authorizationUrl: textOf(fields['authorizationUrl']),
        tokenUrl: textOf(fields['accessTokenUrl']),
        clientId: textOf(fields['clientId']),
        clientSecret: textOf(fields['clientSecret']),
        scope: textOf(fields['scope']),
        redirectUrl: textOf(fields['callbackUrl']),
        pkce: fields['pkce'] === true,
    });
}
