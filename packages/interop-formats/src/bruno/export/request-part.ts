import { colonPathOf, listedRows, namedRowsOf, type FormatDocument } from '@mandor/interop-core';
import type { RequestItem } from '@mandor/schema';

import { urlWithQuery } from './url-with-query.js';

function paramsOf(request: RequestItem): FormatDocument[] {
    const path = request.pathParams
        .filter((line) => line.key !== '')
        .map((line) => ({ name: line.key, value: line.value, type: 'path' }));

    return [...namedRowsOf(request.query).map((row) => ({ ...row, type: 'query' })), ...path];
}

/** What a request and an example's request write alike: where it goes and with which rows. */
export function requestPartOf(request: RequestItem): FormatDocument {
    return {
        method: request.method,
        url: urlWithQuery(colonPathOf(request.url), request.query),
        ...listedRows('headers', namedRowsOf(request.headers)),
        ...listedRows('params', paramsOf(request)),
    };
}
