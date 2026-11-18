import {
    chooseByKey,
    namedRowsOf,
    type FormatDocument,
    type KeyHandlers,
} from '@mandor/interop-core';
import type { RequestBody } from '@mandor/schema';

/** What Bruno keeps a request as: an HTTP one, or a GraphQL one that holds a query. */
type BrunoRequestKind = 'http' | 'graphql';

/** The body of a request and the kind of request it makes it; none when it sends no body. */
export type BodyDocument = { kind: BrunoRequestKind; body: FormatDocument | undefined };

function http(body: FormatDocument | undefined): BodyDocument {
    return { kind: 'http', body };
}

function raw(type: 'json' | 'text' | 'xml'): (body: { content: string }) => BodyDocument {
    return (body) => http({ type, data: body.content });
}

/** What a field of a form says of its value: a text is written as is, a file by the path it names. */
const FIELD_VALUES = {
    text: (value: string) => value,
    file: (value: string) => [value],
};

/** One handler per body type: a type added to the schema must add its row here. */
const BODIES: KeyHandlers<'type', RequestBody, BodyDocument> = {
    none: () => http(undefined),
    json: raw('json'),
    text: raw('text'),
    xml: raw('xml'),
    urlencoded: (body) => http({ type: 'form-urlencoded', data: namedRowsOf(body.fields) }),
    form: (body) =>
        http({
            type: 'multipart-form',
            data: body.fields
                .filter((field) => field.key !== '')
                .map((field) => ({
                    name: field.key,
                    type: field.kind,
                    value: FIELD_VALUES[field.kind](field.value),
                    ...(field.enabled ? {} : { disabled: true }),
                })),
        }),
    binary: (body) =>
        http({
            type: 'file',
            data: [
                { filePath: body.file, contentType: 'application/octet-stream', selected: true },
            ],
        }),
    graphql: (body) => ({
        kind: 'graphql',
        body: { query: body.query, variables: body.variables },
    }),
};

/** The `body` of a request of Bruno, and whether the request is an HTTP one or a GraphQL one. */
export function bodyDocumentOf(body: RequestBody): BodyDocument {
    return chooseByKey(BODIES, body.type, body);
}
