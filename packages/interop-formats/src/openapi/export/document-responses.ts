import type { InteropResponseExample } from '@mandor/interop-core';

import { exampleValue } from './example-value.js';
import { parsedSchema } from './parsed-schema.js';

/** The responses grouped by a key, in the order the first of each group came. */
function groupedBy(
    responses: readonly InteropResponseExample[],
    keyOf: (response: InteropResponseExample) => string,
): Map<string, InteropResponseExample[]> {
    const groups = new Map<string, InteropResponseExample[]>();

    for (const response of responses) {
        groups.set(keyOf(response), [...(groups.get(keyOf(response)) ?? []), response]);
    }

    return groups;
}

/**
 * The responses by status and type: the answer the status names alone as its example, the named
 * ones as a map. Each media type carries the schema its examples answer to.
 */
export function responsesOf(
    responses: readonly InteropResponseExample[],
): Record<string, unknown> | undefined {
    const byStatus = groupedBy(responses, (response) => response.status);

    if (byStatus.size === 0) {
        return undefined;
    }

    return Object.fromEntries(
        [...byStatus].map(([status, group]) => [
            status,
            { description: '', content: contentOf(group) },
        ]),
    );
}

function contentOf(group: readonly InteropResponseExample[]): Record<string, unknown> {
    return Object.fromEntries(
        [...groupedBy(group, (response) => response.contentType)].map(([contentType, media]) => [
            contentType,
            mediaTypeOf(media, contentType, schemaOf(media)),
        ]),
    );
}

/**
 * The schema the examples of one media type answer to: the open schema when none wrote one or
 * none can be read, the one they share, and any of them when the examples answer to different
 * shapes — the params they send tell them apart, and a document has one schema per media type.
 */
function schemaOf(media: readonly InteropResponseExample[]): Record<string, unknown> {
    const parsed = media.flatMap((response) => {
        const schema = parsedSchema(response.schema);

        return schema === undefined ? [] : [schema];
    });
    const distinct = [...new Map(parsed.map((schema) => [JSON.stringify(schema), schema]))];

    if (distinct.length > 1) {
        return { oneOf: distinct.map(([, schema]) => schema) };
    }

    return distinct[0]?.[1] ?? {};
}

/** One media type of a response: the answer the status names alone as its example, the named ones as a map. */
function mediaTypeOf(
    media: readonly InteropResponseExample[],
    contentType: string,
    schema: Record<string, unknown>,
): Record<string, unknown> {
    const lone = media.length === 1 ? media[0] : undefined;

    if (lone !== undefined && lone.name === lone.status) {
        return { schema, example: exampleValue(lone.body, contentType) };
    }

    return {
        schema,
        examples: Object.fromEntries(
            media.map((response) => [
                response.name,
                { value: exampleValue(response.body, contentType) },
            ]),
        ),
    };
}
