import type {
    InteropDocument,
    InteropHttpOperation,
    InteropOperation,
    InteropParameter,
    InteropRequestBody,
} from '@mandor/interop-core';

import { responsesOf } from './document-responses.js';
import { exampleValue } from './example-value.js';
import { parsedSchema } from './parsed-schema.js';

/** The methods OpenAPI names. Anything else no reader of the document would run. */
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * The operations as the paths of the document, grouped under the route each one travels, in the
 * order the operations arrive. The route item speaks what the channel said of it; an operation
 * the document cannot name — a method it does not list, a pair already taken — does not come
 * out, and nobody says so: the format has no place to say it.
 */
export function pathsOfDocument(ir: InteropDocument): Record<string, unknown> {
    const paths: Record<string, Record<string, unknown>> = {};
    const taken = new Map<string, Set<string>>();

    for (const operation of ir.operations) {
        const http = operation.http;

        if (http === undefined) {
            continue;
        }

        const method = http.method.toLowerCase();
        const used = taken.get(http.path) ?? new Set<string>();

        if (!HTTP_METHODS.includes(method) || used.has(method)) {
            continue;
        }

        used.add(method);
        taken.set(http.path, used);

        const item = (paths[http.path] ??= itemOf(ir, http.path));

        item[method] = operationOf(operation, http);
    }

    return paths;
}

/** What the route says of itself, besides the operations that travel it. */
function itemOf(ir: InteropDocument, path: string): Record<string, unknown> {
    const channel = ir.channels.find((candidate) => candidate.address === path);

    return channel?.description === undefined ? {} : { description: channel.description };
}

/** The operation as the document writes it: the loose keys first, the known ones over them. */
function operationOf(
    operation: InteropOperation,
    http: InteropHttpOperation,
): Record<string, unknown> {
    const responses = responsesOf(http.responses);

    return {
        ...operation.extras,
        ...(http.summary === undefined ? {} : { summary: http.summary }),
        ...(http.description === undefined ? {} : { description: http.description }),
        ...(http.tags.length === 0 ? {} : { tags: [...http.tags] }),
        ...(http.parameters.length === 0 ? {} : { parameters: http.parameters.map(parameterOf) }),
        ...(http.requestBody === undefined ? {} : { requestBody: requestBodyOf(http.requestBody) }),
        ...(responses === undefined ? {} : { responses }),
        ...(http.security === null
            ? {}
            : { security: http.security.map((name) => ({ [name]: [] })) }),
    };
}

/** The parameter as the document writes it: required when it says so, the example when the read would not find it again. */
function parameterOf(parameter: InteropParameter): Record<string, unknown> {
    const schema = parsedSchema(parameter.schema);
    const example = parameter.value !== '' || carriesDefault(schema) ? parameter.value : undefined;

    return {
        name: parameter.name,
        in: parameter.in,
        ...(parameter.required ? { required: true } : {}),
        schema: schema ?? {},
        ...(example === undefined ? {} : { example }),
    };
}

/** A parameter without an example falls to the default the schema names, or to its own example. */
function carriesDefault(schema: Record<string, unknown> | undefined): boolean {
    return (
        schema !== undefined && (schema['default'] !== undefined || schema['example'] !== undefined)
    );
}

/** The body as the content of one media type: the schema it promises, and the example it sends. */
function requestBodyOf(body: InteropRequestBody): Record<string, unknown> {
    return {
        content: {
            [body.contentType]: bodyMediaTypeOf(
                parsedSchema(body.schema),
                body.value,
                body.contentType,
            ),
        },
    };
}

/**
 * One media type: its schema, and the example it shows. The schema leaves even when it says
 * nothing — an empty schema is the one word for "any value the API accepts", and the readers
 * of the document ask for the key to be there.
 */
function bodyMediaTypeOf(
    schema: Record<string, unknown> | undefined,
    value: string,
    contentType: string,
): Record<string, unknown> {
    return { schema: schema ?? {}, example: exampleValue(value, contentType) };
}
