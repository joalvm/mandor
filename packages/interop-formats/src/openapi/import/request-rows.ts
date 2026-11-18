import type { InteropParameter } from '@mandor/interop-core';
import type { RequestLine } from '@mandor/schema';

/** The three lists of rows a request keeps its parameters in. */
export type RequestRows = {
    query: RequestLine[];
    headers: RequestLine[];
    pathParams: RequestLine[];
};

/**
 * The parameters of an operation as the rows the request edits. A row carries the contract of
 * its parameter, `schema` and `required`, for the day the document leaves again; `enabled` is
 * the person's, and it starts as the document's `required`. A path row is always on: the url
 * cannot be sent with the hole in it.
 */
export function requestRowsOf(parameters: readonly InteropParameter[]): RequestRows {
    const placed = (place: InteropParameter['in']) =>
        parameters.filter((parameter) => parameter.in === place);

    return {
        query: placed('query').map((parameter) => rowOf(parameter, parameter.required)),
        headers: [
            ...placed('header').map((parameter) => rowOf(parameter, parameter.required)),
            ...cookieOf(placed('cookie')),
        ],
        pathParams: placed('path').map((parameter) => rowOf(parameter, true)),
    };
}

function rowOf(parameter: InteropParameter, enabled: boolean): RequestLine {
    return {
        key: parameter.name,
        value: parameter.value,
        enabled,
        required: parameter.required,
        ...(parameter.schema === undefined ? {} : { schema: parameter.schema }),
    };
}

/** The cookies of an operation travel as one `Cookie` header, on when any of them is required. */
function cookieOf(cookies: readonly InteropParameter[]): RequestLine[] {
    if (cookies.length === 0) {
        return [];
    }

    return [
        {
            key: 'Cookie',
            value: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
            enabled: cookies.some((cookie) => cookie.required),
        },
    ];
}
