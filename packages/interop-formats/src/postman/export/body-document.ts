import { chooseByKey, type FormatDocument, type KeyHandlers } from '@mandor/interop-core';
import type { RequestBody, RequestLine } from '@mandor/schema';

/** The rows of a table of the request: a row half typed is not a row, and one switched off stays. */
export function rowsOf(lines: readonly RequestLine[]): FormatDocument[] {
    return lines
        .filter((line) => line.key !== '')
        .map((line) => ({
            key: line.key,
            value: line.value,
            ...(line.enabled ? {} : { disabled: true }),
            ...(line.description === undefined ? {} : { description: line.description }),
        }));
}

function rawBody(language: string): (body: { content: string }) => FormatDocument {
    return (body) => ({ mode: 'raw', raw: body.content, options: { raw: { language } } });
}

/** Where Postman keeps what a field of a form holds: a text in `value`, a file in `src`. */
const VALUE_KEYS = { text: 'value', file: 'src' } as const;

/** One handler per body type: a type added to the schema must add its row here. */
const BODIES: KeyHandlers<'type', RequestBody, FormatDocument | undefined> = {
    none: () => undefined,
    json: rawBody('json'),
    text: rawBody('text'),
    xml: rawBody('xml'),
    urlencoded: (body) => ({ mode: 'urlencoded', urlencoded: rowsOf(body.fields) }),
    form: (body) => ({
        mode: 'formdata',
        formdata: body.fields
            .filter((field) => field.key !== '')
            .map((field) => ({
                key: field.key,
                type: field.kind,
                [VALUE_KEYS[field.kind]]: field.value,
                ...(field.enabled ? {} : { disabled: true }),
            })),
    }),
    binary: (body) => ({ mode: 'file', file: { src: body.file } }),
    graphql: (body) => ({
        mode: 'graphql',
        graphql: { query: body.query, variables: body.variables },
    }),
};

/** The `body` of a request of Postman, or nothing when the request sends none. */
export function bodyDocumentOf(body: RequestBody): FormatDocument | undefined {
    return chooseByKey(BODIES, body.type, body);
}
