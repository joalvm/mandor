import type { RequestBody } from './request-body.js';

const TYPE_OF_BODY: Record<RequestBody['type'], string | null> = {
    json: 'application/json',
    graphql: 'application/json',
    xml: 'application/xml',
    text: 'text/plain; charset=utf-8',
    urlencoded: 'application/x-www-form-urlencoded',
    // The send keeps the one `Response(form)` makes, with its `boundary`.
    form: 'multipart/form-data',
    none: null,
    binary: null,
};

/**
 * The content type a body implies when the user wrote none: the one whoever sends lays down
 * beside the bytes, and the table of headers reads before then. `none` and `binary` imply
 * none at all — the wire carries no content type the user did not write.
 */
export function bodyContentType(body: { type: RequestBody['type'] }): string | null {
    return TYPE_OF_BODY[body.type];
}
