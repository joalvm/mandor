import {
    type AuthDraft,
    type AuthResult,
    type AuthSubject,
    checkedAuth,
    clientCredentialsDraft,
    codeFlowDraft,
    optionalField,
    textOf,
} from '@mandor/interop-core';

import type { InsomniaAuth } from '../document/insomnia-tree.js';

type Builder = (fields: InsomniaAuth, type: string) => AuthDraft | undefined;

/** Where an api key travels, by the word Insomnia has for it; anything else written is the header. */
const API_KEY_PLACES = new Map([
    ['header', 'header'],
    ['queryParams', 'query'],
    ['cookie', 'cookie'],
]);

const BUILDERS = new Map<string, Builder>([
    ['basic', basic],
    ['bearer', bearer],
    ['apikey', apikey],
    ['oauth2', oauth2],
]);

/**
 * The auth Mandor holds for what a request or a folder of Insomnia says. Nothing written
 * inherits, so no auth is left to write; `none` and a switched-off auth stop the inheritance.
 * What cannot be held says why, and the level enters with no auth: it says `none` so it does
 * not send one it was never meant to. A secret written in the document does not enter.
 */
export function authOf(authentication: InsomniaAuth | undefined, subject: AuthSubject): AuthResult {
    const type = textOf(authentication?.['type']);

    if (authentication === undefined || type === '') {
        return { auth: undefined, degradations: [] };
    }

    if (stopsInheritance(authentication, type)) {
        return { auth: { type: 'none' }, degradations: [] };
    }

    return checkedAuth(BUILDERS.get(type)?.(authentication, type), type, subject);
}

function stopsInheritance(authentication: InsomniaAuth, type: string): boolean {
    return authentication['disabled'] === true || type === 'none';
}

function basic(fields: InsomniaAuth, type: string): AuthDraft {
    const password = textOf(fields['password']);

    return { auth: { type, username: textOf(fields['username']), password }, degradations: [] };
}

function bearer(fields: InsomniaAuth, type: string): AuthDraft {
    const token = textOf(fields['token']);

    return {
        auth: { type, token, ...optionalField('prefix', textOf(fields['prefix'])) },
        degradations: [],
    };
}

function apikey(fields: InsomniaAuth, type: string): AuthDraft {
    const value = textOf(fields['value']);
    const where = API_KEY_PLACES.get(textOf(fields['addTo'])) ?? 'header';

    return { auth: { type, name: textOf(fields['key']), value, in: where }, degradations: [] };
}

/** The flows of oauth2 that Mandor holds, by the grant type Insomnia writes. */
const GRANTS = new Map<string, Builder>([
    ['client_credentials', clientCredentials],
    ['authorization_code', codeFlow],
]);

function oauth2(fields: InsomniaAuth, type: string): AuthDraft | undefined {
    return GRANTS.get(textOf(fields['grantType']))?.(fields, type);
}

function clientCredentials(fields: InsomniaAuth): AuthDraft {
    return clientCredentialsDraft({
        tokenUrl: textOf(fields['accessTokenUrl']),
        clientId: textOf(fields['clientId']),
        clientSecret: textOf(fields['clientSecret']),
        clientAuth: fields['credentialsInBody'] === true ? 'body' : 'basic',
        scope: textOf(fields['scope']),
        audience: textOf(fields['audience']),
    });
}

function codeFlow(fields: InsomniaAuth): AuthDraft {
    return codeFlowDraft({
        authorizationUrl: textOf(fields['authorizationUrl']),
        tokenUrl: textOf(fields['accessTokenUrl']),
        clientId: textOf(fields['clientId']),
        clientSecret: textOf(fields['clientSecret']),
        scope: textOf(fields['scope']),
        redirectUrl: textOf(fields['redirectUrl']),
        pkce: fields['usePkce'] === true,
    });
}
