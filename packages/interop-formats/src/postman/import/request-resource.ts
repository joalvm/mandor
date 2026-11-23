import {
    definedOnly,
    distinct,
    fingerprintOf,
    type ImportResource,
    type InteropDocument,
    type InteropHttpOperation,
    type InteropOperation,
    ownScriptsOf,
} from '@mandor/interop-core';
import { type RequestItem, requestItemBody } from '@mandor/schema';

import { authAt } from './auth-at.js';
import { withDynamicFields } from './dynamic-variables.js';
import { examplesOf } from './examples-of.js';
import { extrasDegradations } from './extras-degradations.js';
import { requestBodyOf } from './request-body-of.js';
import { requestLinesOf } from './request-lines-of.js';
import { originOf } from './origin-of.js';

/**
 * One request of the collection as a request of the collection: the url as the document wrote it,
 * the parameters in their rows, the body, the examples, and its own auth when it asks for one. The
 * scripts land in their moments as they came; what the request kept that no field claims is said,
 * one line each.
 */
export function requestResourceOf(
    document: InteropDocument,
    operation: InteropOperation,
    http: InteropHttpOperation,
    route: string,
): ImportResource {
    const name = http.summary ?? operation.name;
    const body = requestBodyOf(http.requestBody);
    const auth = authAt(http.security, document.security, 'request');
    const extras = extrasDegradations(operation.extras, 'request');
    const request: RequestItem = {
        name,
        method: http.method,
        url: http.url ?? '',
        ...requestLinesOf(http.parameters),
        body: body.body,
        examples: [],
        settings: extras.settings,
        description: http.description,
        auth: auth.auth,
        scripts: ownScriptsOf(http.scripts),
    };
    const { examples, degradations } = examplesOf(http.responses, request);
    const mapped = withDynamicFields(
        definedOnly({ ...requestItemBody({ ...request, examples }), auth: auth.auth }),
    );

    return {
        place: 'item',
        itemKind: 'request',
        route,
        name,
        fields: mapped.fields,
        origin: originOf(document.sourceId, fingerprintOf({ name, ...mapped.fields })),
        degradations: distinct([
            ...auth.degradations,
            ...body.degradations,
            ...degradations,
            ...extras.degradations,
            ...mapped.notes,
        ]),
    };
}
