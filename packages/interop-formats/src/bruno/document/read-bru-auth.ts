import { isRecord, textOf } from '@mandor/interop-core';

import type { BrunoAuth } from './bruno-tree.js';

type Fields = Record<string, unknown>;

/** Where an api key travels, by the word `.bru` has for it; anything else written is the header. */
const API_KEY_PLACES = new Map([
    ['header', 'header'],
    ['queryparams', 'query'],
]);

/** The flows `.bru` names differently from OpenCollection. */
const FLOWS = new Map([['password', 'resource_owner_password_credentials']]);

function oauth2(fields: Fields): BrunoAuth {
    const grant = textOf(fields['grantType']);

    return {
        type: 'oauth2',
        flow: FLOWS.get(grant) ?? grant,
        accessTokenUrl: textOf(fields['accessTokenUrl']),
        authorizationUrl: textOf(fields['authorizationUrl']),
        callbackUrl: textOf(fields['callbackUrl']),
        clientId: textOf(fields['clientId']),
        clientSecret: textOf(fields['clientSecret']),
        placement: textOf(fields['credentialsPlacement']),
        scope: textOf(fields['scope']),
        pkce: fields['pkce'] === true,
    };
}

/** How each scheme reads its block; a scheme not listed keeps only its name. */
const SCHEMES = new Map<string, (fields: Fields) => BrunoAuth>([
    [
        'basic',
        (fields) => ({
            type: 'basic',
            username: textOf(fields['username']),
            password: textOf(fields['password']),
        }),
    ],
    ['bearer', (fields) => ({ type: 'bearer', token: textOf(fields['token']) })],
    [
        'apikey',
        (fields) => ({
            type: 'apikey',
            key: textOf(fields['key']),
            value: textOf(fields['value']),
            placement: API_KEY_PLACES.get(textOf(fields['placement'])) ?? 'header',
        }),
    ],
    ['oauth2', oauth2],
]);

function fieldsOf(blocks: Fields | null | undefined, scheme: string): Fields {
    const block = blocks?.[scheme];

    return isRecord(block) ? block : {};
}

/**
 * The auth a `.bru` level asks for, in the flat form the tree keeps it in. `mode` names the
 * scheme (`inherit` and `none` carry nothing) and `blocks` holds one block of fields per scheme.
 */
export function authOfBru(
    mode: string | null | undefined,
    blocks: Fields | null | undefined,
): BrunoAuth | undefined {
    const scheme = mode ?? '';

    if (scheme === '') {
        return undefined;
    }

    return SCHEMES.get(scheme)?.(fieldsOf(blocks, scheme)) ?? { type: scheme };
}
