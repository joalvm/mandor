import {
    definedOnly,
    distinct,
    fingerprintOf,
    pathParamsOf,
    type ImportResource,
} from '@mandor/interop-core';
import { requestItemBody, type RequestItem, type RequestLine } from '@mandor/schema';

import type { InsomniaRequest, InsomniaRow } from '../document/insomnia-tree.js';
import { authOf } from './auth-of.js';
import { requestBodyOf } from './body-of.js';
import { originOf } from './origin-of.js';
import { requestSettingsOf } from './request-settings-of.js';
import { scriptsOf } from './scripts-of.js';
import { withTemplates } from './template-of.js';

export function linesOf(rows: readonly InsomniaRow[]): RequestLine[] {
    return rows.map((row) => ({ key: row.name, value: row.value, enabled: !row.disabled }));
}

/**
 * One request of the collection as a request of the workspace: the url as the document wrote
 * it with its path parameters in braces, the query and the headers in their rows, the body, and
 * its own auth when it asks for one, its switches and its scripts. What Insomnia kept that no
 * field claims is said. A script is someone's code: its text enters untouched.
 */
export function requestResourceOf(
    request: InsomniaRequest,
    sourceId: string,
    route: string,
): ImportResource {
    const body = requestBodyOf(request.body);
    const auth = authOf(request.authentication, 'request');
    const path = pathParamsOf(request.url, request.pathParameters);
    const switches = requestSettingsOf(request.settings);
    const scripts = scriptsOf(request.scripts);
    const item: RequestItem = {
        name: request.name,
        method: request.method.toUpperCase(),
        url: path.url,
        query: linesOf(request.parameters),
        headers: linesOf(request.headers),
        pathParams: path.lines,
        body: body.body,
        examples: [],
        settings: switches.settings,
        description: request.description === '' ? undefined : request.description,
        auth: auth.auth,
    };
    const mapped = withTemplates(definedOnly({ ...requestItemBody(item), auth: auth.auth }));
    const fields = {
        ...mapped.value,
        ...(scripts.importedScripts.length === 0
            ? {}
            : { importedScripts: scripts.importedScripts }),
    };

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
            ...switches.degradations,
            ...scripts.degradations,
            ...mapped.notes,
        ]),
    };
}
