import type { HttpResponse, RequestExample } from '@mandor/schema';

import { contentTypeOf } from '../../../response/lib/body-views.js';

/** The body of a response as text, or nothing when it came as bytes or went to disk. */
export function textOfResponse(response: HttpResponse): string {
    const { body } = response;

    return body?.kind === 'inline' && body.encoding === 'utf8' ? body.text : '';
}

/**
 * A response kept as an example of the request: named by its status, with its type and the body
 * as text. A body that came as bytes, or so big it went to disk, is not text an example can
 * hold, and the example keeps the status and the type without it.
 */
export function exampleOf(response: HttpResponse): RequestExample {
    const status = String(response.status);

    return {
        body: textOfResponse(response),
        ...(response.cookies.length > 0 && { cookies: response.cookies }),
        contentType: contentTypeOf(response),
        ...(response.headers.length > 0 && { headers: response.headers }),
        name: [status, response.statusText].filter((part) => part !== '').join(' '),
        status,
    };
}
