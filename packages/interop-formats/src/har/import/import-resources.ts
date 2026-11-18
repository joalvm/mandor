import {
    claimRoute,
    collectionResourceOf,
    type Degradation,
    fingerprintOf,
    type ImportResource,
    type InteropDocument,
    type InteropHttpOperation,
    type InteropOperation,
    type InteropParameter,
    type TakenRoutes,
    underCollection,
    distinct,
} from '@mandor/interop-core';
import {
    createRequestItem,
    requestItemBody,
    type ItemOrigin,
    type RequestItem,
    type RequestLine,
} from '@mandor/schema';

import { extrasDegradations } from './extras-degradations.js';
import { requestBodyOf } from './request-body-of.js';

/**
 * The document as the resources a workspace holds: one folder per host, then one request per
 * operation inside the folder of its host. Two of the same name take `-2`, and a name an id
 * cannot keep takes the plain word of its kind.
 */
export function importResourcesOf(document: InteropDocument): ImportResource[] {
    const collection = collectionResourceOf({
        name: document.name,
        origin: { kind: 'har', sourceId: document.sourceId },
    });
    const inside = collection.route;
    const taken: TakenRoutes = new Map([['', new Set([collection.route])]]);
    const routes = new Map<string, string>();
    const folders = (document.groups ?? []).map((group) => {
        const host = group.path.join('');
        const route = underCollection(inside, claimRoute(taken, '', host, 'host'));

        routes.set(host, route);

        return resourceOf(document, { place: 'folder', itemKind: null, route, name: host }, [], {
            name: host,
        });
    });

    // The slugs the folders took inside the collection, so a request with no group that lands
    // beside them cannot take the segment of a directory that is already there.
    taken.set(inside, new Set(folders.map((folder) => folder.route.slice(inside.length + 1))));

    const items = document.operations.flatMap((operation) => {
        const http = operation.http;

        if (http === undefined) {
            return [];
        }

        const parent = routes.get((http.group ?? []).join('')) ?? inside;
        const route = claimRoute(taken, parent, http.summary ?? operation.name, 'request');

        return [itemOf(document, operation, http, route)];
    });

    return [collection, ...folders, ...items];
}

function itemOf(
    document: InteropDocument,
    operation: InteropOperation,
    http: InteropHttpOperation,
    route: string,
): ImportResource {
    const name = http.summary ?? operation.name;
    const body = requestBodyOf(http.requestBody);
    const request: RequestItem = {
        ...createRequestItem({ name }),
        method: http.method,
        url: http.url ?? '',
        query: rowsOf(http.parameters, 'query'),
        headers: rowsOf(http.parameters, 'header'),
        body: body.body,
        examples: http.responses,
    };
    const fields = Object.fromEntries(
        Object.entries(requestItemBody(request)).filter(([, value]) => value !== undefined),
    );
    const degradations = [...body.degradations, ...extrasDegradations(operation.extras)];

    return resourceOf(
        document,
        { place: 'item', itemKind: 'request', route, name },
        degradations,
        fields,
    );
}

function resourceOf(
    document: InteropDocument,
    identity: Pick<ImportResource, 'place' | 'itemKind' | 'route' | 'name'>,
    degradations: readonly Degradation[],
    fields: Record<string, unknown>,
): ImportResource {
    const origin: ItemOrigin = {
        kind: 'har',
        sourceId: document.sourceId,
        fingerprint: fingerprintOf({ name: identity.name, ...fields }),
    };

    return { ...identity, fields, origin, degradations: distinct(degradations) };
}

function rowsOf(parameters: readonly InteropParameter[], place: 'query' | 'header'): RequestLine[] {
    return parameters
        .filter((parameter) => parameter.in === place)
        .map((parameter) => ({
            key: parameter.name,
            value: parameter.value,
            enabled: parameter.enabled !== false,
        }));
}
