import {
    definedOnly,
    distinct,
    fingerprintOf,
    pathParamsOf,
    type ImportResource,
} from '@mandor/interop-core';
import { requestItemBody, type RequestItem } from '@mandor/schema';

import type { BrunoRequest } from '../document/bruno-tree.js';
import { authOf } from './auth-of.js';
import { requestBodyOf } from './body-of.js';
import { examplesOf } from './examples-of.js';
import { leftOutText } from './left-out-text.js';
import { originOf } from './origin-of.js';
import { queryOfUrl } from './query-of-url.js';
import { linesOf } from './request-lines.js';
import { requestSettingsOf } from './request-settings-of.js';

/**
 * One request of the collection as a request of the workspace: the url without its query, which
 * goes to the rows, with its path parameters in braces, the headers, the body, and its own auth
 * when it asks for one, its settings and its examples. What Bruno kept that no field claims is
 * said.
 */
export function requestResourceOf(
    request: BrunoRequest,
    sourceId: string,
    route: string,
): ImportResource {
    const body = requestBodyOf(request.body);
    const auth = authOf(request.auth, 'request');
    const query = queryOfUrl(request.url, request.params);
    const path = pathParamsOf(query.url, request.pathParams);
    const settings = requestSettingsOf(request.settings);
    const parent: RequestItem = {
        name: request.name,
        method: request.method,
        url: path.url,
        query: linesOf(query.rows),
        headers: linesOf(request.headers),
        pathParams: path.lines,
        body: body.body,
        examples: [],
        settings: settings.settings,
        description: request.description === '' ? undefined : request.description,
        auth: auth.auth,
    };
    const examples = examplesOf(request.examples, parent);
    const item: RequestItem = { ...parent, examples: examples.examples };
    const tags = request.tags.filter((tag) => tag.trim() !== '');
    const fields = definedOnly({
        ...requestItemBody(item),
        auth: auth.auth,
        tags: tags.length === 0 ? undefined : tags,
    });

    return {
        place: 'item',
        itemKind: 'request',
        route,
        name: request.name,
        fields,
        origin: originOf(sourceId, fingerprintOf({ name: request.name, ...fields })),
        degradations: distinct([
            ...auth.degradations,
            ...body.degradations,
            ...settings.degradations,
            ...examples.degradations,
            ...leftOutText('request', request.leftOut),
        ]),
    };
}
