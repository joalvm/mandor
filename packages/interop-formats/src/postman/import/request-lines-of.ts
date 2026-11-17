import type { InteropParameter } from '@mandor/interop-core';
import type { RequestItem, RequestLine } from '@mandor/schema';

function linesAt(
    parameters: readonly InteropParameter[],
    place: 'query' | 'header' | 'path',
): RequestLine[] {
    return parameters
        .filter((parameter) => parameter.in === place)
        .map((parameter) => ({
            key: parameter.name,
            value: parameter.value,
            enabled: parameter.enabled ?? parameter.required,
        }));
}

/** The parameters of an operation in the three tables of a request. */
export function requestLinesOf(
    parameters: readonly InteropParameter[],
): Pick<RequestItem, 'query' | 'headers' | 'pathParams'> {
    return {
        query: linesAt(parameters, 'query'),
        headers: linesAt(parameters, 'header'),
        pathParams: linesAt(parameters, 'path'),
    };
}
