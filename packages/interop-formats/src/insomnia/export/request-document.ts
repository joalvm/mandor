import {
    colonPathOf,
    concreteAuthOf,
    listedRows,
    namedRowsOf,
    type FormatDocument,
    type WorkspaceFolderNode,
} from '@mandor/interop-core';
import {
    inheritedHeaders,
    parseRequestItem,
    type CollectionItem,
    type ConcreteAuth,
    type RequestItem,
} from '@mandor/schema';

import { authDocumentOf } from './auth-document.js';
import { bodyDocumentOf } from './body-document.js';
import { insomniaIdOf } from './insomnia-id.js';
import { withReferences } from './reference-of.js';
import { requestSettingsDocumentOf } from './request-settings-document.js';
import { scriptsDocumentOf } from './scripts-document.js';

function pathParametersOf(request: RequestItem): FormatDocument[] {
    return request.pathParams
        .filter((line) => line.key !== '')
        .map((line) => ({ name: line.key, value: line.value }));
}

/**
 * One request of the collection as the item Insomnia lists. `where` is the path of names that
 * leads to it, which gives it an id that survives the next export. `inherited` is the auth the
 * request answers to when the place it hangs from cannot say it for it: the collection of
 * Insomnia has no auth. `above` is the same for the headers: the levels with no place in Insomnia
 * whose lines the request has to send by itself.
 */
export function requestDocumentOf(
    item: CollectionItem,
    where: readonly string[],
    inherited: ConcreteAuth | undefined,
    above: readonly WorkspaceFolderNode[] = [],
): FormatDocument {
    const request = parseRequestItem(item);
    const auth = concreteAuthOf(request.auth) ?? inherited;
    const body = bodyDocumentOf(request.body);
    const content: FormatDocument = {
        url: colonPathOf(request.url),
        name: item.name,
        meta: {
            id: insomniaIdOf('req', ...where, item.name),
            ...(request.description === undefined ? {} : { description: request.description }),
        },
        method: request.method,
        ...(body === undefined ? {} : { body }),
        ...listedRows('parameters', namedRowsOf(request.query)),
        ...listedRows('headers', namedRowsOf(inheritedHeaders(above, request.headers).sent)),
        ...listedRows('pathParameters', pathParametersOf(request)),
        ...(auth === undefined ? {} : { authentication: authDocumentOf(auth) }),
    };

    // A script is someone's code: its text leaves untouched, past the references.
    return {
        ...withReferences(content),
        ...requestSettingsDocumentOf(request.settings),
        ...scriptsDocumentOf(request.scripts),
    };
}
