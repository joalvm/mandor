import {
    chooseByKey,
    namedRowsOf,
    type FormatDocument,
    type KeyHandlers,
} from '@mandor/interop-core';
import type { RequestBody } from '@mandor/schema';

function textBody(mimeType: string): (body: { content: string }) => FormatDocument {
    return (body) => ({ mimeType, text: body.content });
}

/** The variables of a GraphQL body are JSON text; Insomnia keeps them as the object they are. */
function variablesOf(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return {};
    }
}

/** What a field of a form says of its value: a text is written as is, a file by the path it names. */
const FIELD_VALUES = {
    text: (value: string) => ({ value }),
    file: (value: string) => ({ value: '', type: 'file', fileName: value }),
};

/** One handler per body type: a type added to the schema must add its row here. */
const BODIES: KeyHandlers<'type', RequestBody, FormatDocument | undefined> = {
    none: () => undefined,
    json: textBody('application/json'),
    text: textBody('text/plain'),
    xml: textBody('application/xml'),
    urlencoded: (body) => ({
        mimeType: 'application/x-www-form-urlencoded',
        params: namedRowsOf(body.fields),
    }),
    form: (body) => ({
        mimeType: 'multipart/form-data',
        params: body.fields
            .filter((field) => field.key !== '')
            .map((field) => ({
                name: field.key,
                ...FIELD_VALUES[field.kind](field.value),
                ...(field.enabled ? {} : { disabled: true }),
            })),
    }),
    binary: (body) => ({ mimeType: 'application/octet-stream', fileName: body.file }),
    graphql: (body) => ({
        mimeType: 'application/graphql',
        text: JSON.stringify({
            query: body.query,
            variables: variablesOf(body.variables),
            ...(body.operationName === undefined ? {} : { operationName: body.operationName }),
        }),
    }),
};

/** The `body` of a request of Insomnia, or nothing when the request sends none. */
export function bodyDocumentOf(body: RequestBody): FormatDocument | undefined {
    return chooseByKey(BODIES, body.type, body);
}
