import { definedOnly } from '@mandor/interop-core';
import type { z } from 'zod';

import type { BrunoAuth } from './bruno-tree.js';
import type { authSchema } from './opencollection-schema.js';

type OcAuth = z.output<typeof authSchema>;
type Scheme = Exclude<NonNullable<OcAuth>, 'inherit'>;

function oauth2Of(auth: Scheme): BrunoAuth {
    return definedOnly({
        type: 'oauth2',
        flow: auth.flow,
        accessTokenUrl: auth.accessTokenUrl,
        authorizationUrl: auth.authorizationUrl,
        callbackUrl: auth.callbackUrl,
        clientId: auth.credentials?.clientId,
        clientSecret: auth.credentials?.clientSecret,
        placement: auth.credentials?.placement,
        scope: auth.scope,
        pkce: auth.pkce !== null && auth.pkce !== undefined && auth.pkce.disabled !== true,
    });
}

/** The auth an OpenCollection level asks for, in the flat form the tree keeps it in. */
export function authOfOpenCollection(auth: OcAuth): BrunoAuth | undefined {
    if (auth === null || auth === undefined) {
        return undefined;
    }

    if (auth === 'inherit') {
        return { type: 'inherit' };
    }

    if (auth.type === 'oauth2') {
        return oauth2Of(auth);
    }

    return definedOnly({
        type: auth.type,
        username: auth.username,
        password: auth.password,
        token: auth.token,
        key: auth.key,
        value: auth.value,
        placement: auth.placement,
    });
}
