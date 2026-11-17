import type { RequestBody, RequestItem } from '@mandor/schema';

import { chooseByKey, type KeyHandlers } from '../choose/choose-by-key.js';
import type { InteropRequestBody } from '../ir/interop-document.js';

/** What a body type says of itself: its content type and sample, and whether the schema travels. */
type Sample = { contentType: string; value: string; withSchema?: true };

/** How each body type speaks, one handler per type: a type added to the schema must add its row. */
const BODIES: KeyHandlers<'type', RequestBody, Sample | undefined> = {
    none: () => undefined,
    json: (body) => ({
        contentType: 'application/json',
        value: jsonOf(body.content),
        withSchema: true,
    }),
    text: (body) => ({ contentType: 'text/plain', value: body.content }),
    xml: (body) => ({ contentType: 'application/xml', value: body.content }),
    urlencoded: (body) => ({
        contentType: 'application/x-www-form-urlencoded',
        value: fieldsOf(body.fields),
    }),
    form: (body) => ({ contentType: 'multipart/form-data', value: fieldsOf(body.fields) }),
    // What the file holds is not here to speak: the document names the kind, and no content.
    binary: () => ({ contentType: 'application/octet-stream', value: '' }),
    graphql: (body) => ({ contentType: 'application/json', value: graphQlOf(body) }),
};

/**
 * What the body of a request says, as the content of the document speaks it: one content type
 * per shape the request keeps, the sample as text, and the schema the body promises when the
 * document gave one. The request never says the body is required, so the document does not
 * either.
 */
export function requestBodyOf(request: RequestItem): InteropRequestBody | undefined {
    const { body } = request;
    const sample = chooseByKey(BODIES, body.type, body);

    if (sample === undefined) {
        return undefined;
    }

    const schema = sample.withSchema === true ? schemaOf(request.bodySchema) : undefined;

    return { contentType: sample.contentType, value: sample.value, schema, required: false };
}

/**
 * A body written as JSON keeps its shape: what parses, pretty; what does not, as written —
 * the same text the read turns into an example, so the way out and the way in agree.
 */
function jsonOf(content: string): string {
    try {
        const parsed: unknown = JSON.parse(content);

        return typeof parsed === 'string' ? content : JSON.stringify(parsed, null, 2);
    } catch {
        return content;
    }
}

function fieldsOf(fields: readonly { key: string; value: string }[]): string {
    return JSON.stringify(
        Object.fromEntries(
            fields.filter((field) => field.key !== '').map((field) => [field.key, field.value]),
        ),
        null,
        2,
    );
}

function graphQlOf(body: Extract<RequestBody, { type: 'graphql' }>): string {
    return JSON.stringify(
        {
            query: body.query,
            variables: parsedOrEmpty(body.variables),
            ...(body.operationName === undefined ? {} : { operationName: body.operationName }),
        },
        null,
        2,
    );
}

function parsedOrEmpty(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

/** The schema travels only when it is JSON: anything else the writer could not read back. */
function schemaOf(schema: string | undefined): string | undefined {
    if (schema === undefined || schema === '') {
        return undefined;
    }

    try {
        JSON.parse(schema);

        return schema;
    } catch {
        return undefined;
    }
}
