import {
    type AuthConfig,
    type CollectionItem,
    type ConcreteAuth,
    parseRequestItem,
    type RequestItem,
} from '@mandor/schema';

import type { InteropOperation } from '../ir/interop-document.js';
import { irEqual } from '../ir/ir-equal.js';
import { requestBodyOf } from './body-of-request.js';
import { parametersOf } from './parameters-of-request.js';
import { pathOfUrl } from './path-of-url.js';

/** What one operation needs to name its security: the schemes of the chain and the default. */
export type RequestSecurity = {
    nameOf: (auth: ConcreteAuth) => string | null;
    defaultSecurity: string[];
};

/** The folder the operation hangs from: the tag its requests carry and the auth they inherit. */
export type RequestFolder = { name: string; auth?: ConcreteAuth | undefined };

/**
 * The body keys this turn claims for typed fields: the envelope's own — kind, name, tags,
 * origin —, every field of the request model, and the auth the file carries beside them.
 * Everything else the body holds stays loose and rides back as extras, which is what makes a
 * key the import kept come out again.
 */
const CLAIMED_REQUEST_KEYS = new Set([
    'kind',
    'name',
    'tags',
    'origin',
    'method',
    'url',
    'query',
    'headers',
    'pathParams',
    'body',
    'bodySchema',
    'examples',
    'responseSchemas',
    'settings',
    'description',
    'auth',
]);

/**
 * One request of the collection as the operation it sends, under the channel its path names. The
 * item is read whole — a body that no longer parses throws, and the export answers the way it
 * answers a file it cannot read. What the request keeps that the document said rides back; what
 * it never kept, nobody invents.
 */
export function operationOfRequest(
    item: CollectionItem,
    folder: RequestFolder | null,
    security: RequestSecurity,
): InteropOperation {
    const request = parseRequestItem(item);
    const path = pathOfUrl(request.url);

    return {
        name: item.name,
        channel: path,
        direction: 'outgoing',
        message: undefined,
        // The HTTP part owns the security: null inherits, an empty list asks for none, a name
        // asks for the scheme it names.
        security: [],
        http: {
            method: request.method.toUpperCase(),
            path,
            summary: item.name,
            description: request.description,
            // The folder goes first: it is the tag that opens it again on the way back in.
            tags: [...new Set([...(folder === null ? [] : [folder.name]), ...item.tags])],
            parameters: parametersOf(request),
            requestBody: requestBodyOf(request),
            responses: request.examples.map((example) => ({
                name: example.name,
                status: example.status,
                contentType: example.contentType,
                body: example.body,
                ...(example.schema !== undefined && { schema: example.schema }),
            })),
            security: securityOf(request, folder, security),
        },
        extras: extrasOf(item),
    };
}

/**
 * The chain the item answers to: its own auth, else the one its folders speak, else inherit.
 * An empty list is no auth at all; the default of the document says itself, so an operation
 * that repeats it says nothing.
 */
function securityOf(
    request: RequestItem,
    folder: RequestFolder | null,
    security: RequestSecurity,
): string[] | null {
    const own = concreteOf(request.auth) ?? concreteOf(folder?.auth);

    if (own === null) {
        return null;
    }

    // An auth that decides against auth is an empty list; one whose shape no scheme of the
    // document speaks says nothing, and inherits whatever the document asks of everything.
    let result: string[];

    if (own.type === 'none') {
        result = [];
    } else {
        const asked = security.nameOf(own);

        if (asked === null) {
            return null;
        }

        result = [asked];
    }

    return irEqual(result, security.defaultSecurity) ? null : result;
}

/** The auth that decides at this level; absent and `{ inherit: true }` both defer. */
function concreteOf(auth: AuthConfig | undefined): ConcreteAuth | null {
    return auth === undefined || 'inherit' in auth ? null : auth;
}

function extrasOf(item: CollectionItem): Record<string, unknown> {
    const extras: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(item.body)) {
        if (key !== '$ref' && !CLAIMED_REQUEST_KEYS.has(key)) {
            extras[key] = value;
        }
    }

    return extras;
}
