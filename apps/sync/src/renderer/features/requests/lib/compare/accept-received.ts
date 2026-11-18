import type { HttpResponse, RequestExample } from '@mandor/schema';

import { exampleOf } from '../example-of.js';

/**
 * The example with what came taken as what it expects: the status, the type, the body, and the
 * headers and cookies when there were any. What names it, what its request changes and what it
 * leaves out of a comparison are the person's, and stay.
 */
export function acceptedExample(example: RequestExample, response: HttpResponse): RequestExample {
    const { body, contentType, cookies, headers, status } = exampleOf(response);
    const kept = Object.fromEntries(
        Object.entries(example).filter(([key]) => key !== 'cookies' && key !== 'headers'),
    ) as RequestExample;

    return {
        ...kept,
        body,
        ...(cookies !== undefined && { cookies }),
        contentType,
        ...(headers !== undefined && { headers }),
        status,
    };
}
