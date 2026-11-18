import { chooseByKey, type InteropExampleRequest, type KeyHandlers } from '@mandor/interop-core';
import type { AuthConfig } from '@mandor/schema';

import type { PostmanRequest } from '../document/postman-collection-schema.js';
import { authConfigOf } from './auth-config-of.js';
import { authSchemeOf, type AuthChoice } from './auth-scheme-of.js';
import { descriptionOf } from './description-of.js';
import { postmanBodyOf } from './map-body.js';
import { headersOf } from './map-headers.js';
import { urlOf } from './map-url.js';

const AUTH_OF: KeyHandlers<'kind', AuthChoice, AuthConfig | undefined> = {
    inherit: () => undefined,
    none: () => ({ type: 'none' }),
    scheme: ({ scheme }) => authConfigOf(scheme, 'request').auth,
};

/** The request a response was saved with, read as any request of the collection is. */
export function exampleRequestOf(request: PostmanRequest): InteropExampleRequest {
    const choice = authSchemeOf(request.auth);

    return {
        parameters: [...urlOf(request.url ?? undefined).parameters, ...headersOf(request)],
        requestBody: postmanBodyOf(request.body).body,
        auth: chooseByKey(AUTH_OF, choice.kind, choice),
        description: descriptionOf(request.description),
    };
}
