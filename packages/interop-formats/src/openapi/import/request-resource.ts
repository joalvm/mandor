import {
    type Degradation,
    degradation,
    fingerprintOf,
    type ImportResource,
    type InteropHttpOperation,
    type InteropOperation,
    type InteropSecurityScheme,
} from '@mandor/interop-core';
import { type AuthConfig, type RequestItem, requestItemBody } from '@mandor/schema';

import { authOfScheme, namedSecurity } from './auth-of-scheme.js';
import { requestBodyTypeOf } from './request-body-of.js';
import { requestRowsOf } from './request-rows.js';

// The envelope keys the collection owns. An operation key by one of these names would write over the
// envelope itself, so it is dropped from the loose keys instead of spread into the item.
const ENVELOPE_KEYS = new Set(['kind', 'name', 'tags', 'origin']);

/** What the item needs to know about the document around its operation. */
export type RequestContext = {
    sourceId: string;
    route: string;
    security: Record<string, InteropSecurityScheme>;
    /** The scheme the workspace file carries: a request that asks for it inherits it. */
    workspaceScheme: string | undefined;
    /** What the document asks of every operation that says nothing: a request owns it when no workspace holds it. */
    defaultSecurity: string[];
    /** What the url of the request starts with, before its path. */
    base: string;
};

/**
 * One operation as a request of the collection. The url keeps the path as the document writes it,
 * `{petId}` and all, behind the base the scope gives it; the body, the schema and the
 * responses of the document ride in the request. What the operation said that no field claimed
 * rides as loose keys of the item, which keeps what Mandor does not understand. The first tag
 * opened the folder the request hangs from; the others stay on the request.
 */
export function requestResourceOf(
    operation: InteropOperation,
    http: InteropHttpOperation,
    context: RequestContext,
): ImportResource {
    const rows = requestRowsOf(http.parameters);
    const { body, degradations } = requestBodyTypeOf(http.requestBody);
    const security = authOfOperation(http.security, context);
    const request: RequestItem = {
        name: operation.name,
        method: http.method,
        url: `${context.base}${http.path}`,
        ...rows,
        body,
        bodySchema: http.requestBody?.schema,
        examples: http.responses,
        settings: {},
        description: http.description,
    };
    const fields = {
        ...looseExtras(operation.extras),
        ...definedOnly({
            ...requestItemBody(request),
            auth: security.auth,
            tags: tagsAfterFolder(http.tags),
        }),
    };

    return {
        place: 'item',
        itemKind: 'request',
        route: context.route,
        name: operation.name,
        fields,
        origin: {
            kind: 'openapi',
            sourceId: context.sourceId,
            fingerprint: fingerprintOf({ name: operation.name, ...fields }),
        },
        degradations: [...degradations, ...security.degradations],
    };
}

function tagsAfterFolder(tags: readonly string[]): string[] | undefined {
    const left = tags.filter((tag) => tag.trim() !== '').slice(1);

    return left.length === 0 ? undefined : left;
}

type OperationAuth = { auth: AuthConfig | undefined; degradations: Degradation[] };

/**
 * Null inherits what the workspace carries, or takes the default of the document when there is
 * no workspace file to carry it; so does the scheme the workspace carries. An empty list is no
 * auth at all; any other scheme is the request's own.
 */
function authOfOperation(asked: string[] | null, context: RequestContext): OperationAuth {
    const named = asked ?? (context.workspaceScheme === undefined ? context.defaultSecurity : []);
    const name = named[0];

    if (
        (asked === null && name === undefined) ||
        (named.length > 0 && name === context.workspaceScheme)
    ) {
        return { auth: undefined, degradations: [] };
    }

    if (name === undefined) {
        return { auth: { type: 'none' }, degradations: [] };
    }

    const scheme = context.security[name];
    const mapping =
        scheme === undefined
            ? { reason: degradation('securityNotDeclared') }
            : authOfScheme(scheme);

    return 'auth' in mapping
        ? { auth: mapping.auth, degradations: [] }
        : {
              auth: undefined,
              degradations: [namedSecurity(name, mapping.reason)],
          };
}

function looseExtras(extras: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(extras).filter(([key]) => !ENVELOPE_KEYS.has(key)));
}

function definedOnly(record: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
