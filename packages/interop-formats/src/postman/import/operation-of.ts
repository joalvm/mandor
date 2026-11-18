import type {
    InteropHttpOperation,
    InteropOperation,
    InteropSecurityScheme,
} from '@mandor/interop-core';

import type { PostmanItem, PostmanRequest } from '../document/postman-collection-schema.js';
import { authSchemeOf, securityOf } from './auth-scheme-of.js';
import { descriptionOf } from './description-of.js';
import { extrasOf } from './extras-of.js';
import { postmanBodyOf } from './map-body.js';
import { headersOf } from './map-headers.js';
import { responsesOf } from './map-responses.js';
import { scriptsOf } from './map-scripts.js';
import { urlOf } from './map-url.js';

const ITEM_CONSUMED = ['id', 'name', 'description', 'request', 'response', 'event'];
const REQUEST_CONSUMED = ['method', 'url', 'header', 'body', 'auth', 'description'];

export type OperationResult = {
    operation: InteropOperation;
    /** The scheme of the request's own auth, to declare under `request:<name>`. */
    scheme?: InteropSecurityScheme;
};

/** A request of the collection as the operation that sends it. `name` is already unique. */
export function operationOf(
    item: PostmanItem,
    request: PostmanRequest,
    place: { name: string; group: string[] },
): OperationResult {
    const { security, scheme } = securityOf(authSchemeOf(request.auth), `request:${place.name}`);
    const url = urlOf(request.url ?? undefined);
    const body = postmanBodyOf(request.body);
    const extras = {
        ...extrasOf(item, ITEM_CONSUMED),
        ...extrasOf(request, REQUEST_CONSUMED),
        ...(url.hash === undefined ? {} : { hash: url.hash }),
        ...(body.lost === undefined ? {} : { lost: body.lost }),
    };
    const http: InteropHttpOperation = {
        method: methodOf(request.method),
        path: '',
        summary: item.name ?? undefined,
        description: descriptionOf(item.description) ?? descriptionOf(request.description),
        tags: [],
        parameters: [...url.parameters, ...headersOf(request)],
        requestBody: body.body,
        responses: responsesOf(item.response),
        security,
        url: url.url.trim() === '' ? undefined : url.url,
        group: place.group.length === 0 ? undefined : place.group,
        scripts: scriptsOf(item.event),
    };
    const operation: InteropOperation = {
        name: place.name,
        channel: place.name,
        direction: 'outgoing',
        security: [],
        http,
        extras,
    };

    return scheme === undefined ? { operation } : { operation, scheme };
}

function methodOf(method: string | null | undefined): string {
    return method === undefined || method === null || method.trim() === ''
        ? 'GET'
        : method.trim().toUpperCase();
}
