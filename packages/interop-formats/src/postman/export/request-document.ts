import {
    colonPathOf,
    concreteAuthOf,
    type FormatDocument,
    type WorkspaceFolderNode,
} from '@mandor/interop-core';
import {
    exampleRequest,
    inheritedHeaders,
    parseRequestItem,
    type CollectionItem,
    type RequestExample,
    type RequestItem,
    type ResponseCookie,
} from '@mandor/schema';

import { authDocumentOf } from './auth-document.js';
import { bodyDocumentOf, rowsOf } from './body-document.js';
import { profileDocumentOf } from './profile-document.js';
import { scriptEventsOf } from './script-events.js';

function urlDocumentOf(request: RequestItem): FormatDocument {
    const path = colonPathOf(request.url);
    const query = rowsOf(request.query);
    const sent = request.query
        .filter((line) => line.key !== '' && line.enabled)
        .map((line) => `${line.key}=${line.value}`);
    const variable = request.pathParams
        .filter((line) => line.key !== '')
        .map((line) => ({ key: line.key, value: line.value }));

    return {
        raw: sent.length === 0 ? path : `${path}?${sent.join('&')}`,
        ...(query.length === 0 ? {} : { query }),
        ...(variable.length === 0 ? {} : { variable }),
    };
}

/** What goes out of a request: the same whether it is the request or the one of an example. */
function requestPartOf(
    request: RequestItem,
    chain: readonly WorkspaceFolderNode[],
): FormatDocument {
    const auth = concreteAuthOf(request.auth);
    const body = bodyDocumentOf(request.body);

    return {
        method: request.method,
        header: rowsOf(inheritedHeaders(chain, request.headers).sent),
        ...(body === undefined ? {} : { body }),
        url: urlDocumentOf(request),
        ...(auth === undefined ? {} : { auth: authDocumentOf(auth) }),
        ...(request.description === undefined ? {} : { description: request.description }),
    };
}

/** The headers it answers with, with the type first when they do not say it themselves. */
function answerHeadersOf({ contentType, headers = [] }: RequestExample): FormatDocument[] {
    const says = headers.some(([key]) => key.toLowerCase() === 'content-type');

    return [
        ...(contentType === '' || says ? [] : [{ key: 'Content-Type', value: contentType }]),
        ...headers.map(([key, value]) => ({ key, value })),
    ];
}

/** A cookie as Postman writes it, which asks for a domain and a path even when none is known. */
function cookieDocumentOf({
    name,
    value,
    domain = '',
    path = '',
    expires,
    httpOnly,
    secure,
}: ResponseCookie): FormatDocument {
    return {
        name,
        value,
        domain,
        path,
        ...(expires === undefined ? {} : { expires }),
        httpOnly,
        secure,
    };
}

function examplesOf(request: RequestItem, chain: readonly WorkspaceFolderNode[]): FormatDocument[] {
    return request.examples.map((example) => {
        const code = Number.parseInt(example.status, 10);
        const cookies = example.cookies ?? [];

        return {
            name: example.name,
            originalRequest: requestPartOf(exampleRequest(request, example), chain),
            ...(Number.isNaN(code) ? {} : { code }),
            header: answerHeadersOf(example),
            ...(cookies.length === 0 ? {} : { cookie: cookies.map(cookieDocumentOf) }),
            body: example.body,
        };
    });
}

/**
 * One request of the collection as the item Postman lists it. Postman has no headers at a level,
 * so the request carries those of `chain`, the levels over it with the closest first: what goes
 * out is what Mandor sends.
 */
export function requestDocumentOf(
    item: CollectionItem,
    chain: readonly WorkspaceFolderNode[] = [],
): FormatDocument {
    const request = parseRequestItem(item);
    const events = scriptEventsOf(request.importedScripts);

    return {
        name: item.name,
        request: requestPartOf(request, chain),
        response: examplesOf(request, chain),
        ...(events.length === 0 ? {} : { event: events }),
        ...profileDocumentOf(request.settings),
    };
}
