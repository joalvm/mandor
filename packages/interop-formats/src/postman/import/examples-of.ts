import type { Degradation, InteropResponseExample } from '@mandor/interop-core';
import { exampleOverrides, type RequestExample, type RequestItem } from '@mandor/schema';

import { requestBodyOf } from './request-body-of.js';
import { requestLinesOf } from './request-lines-of.js';

type ExampleMapping = { example: RequestExample; degradations: Degradation[] };

function exampleOf(
    { sentWith, ...example }: InteropResponseExample,
    parent: RequestItem,
): ExampleMapping {
    if (sentWith === undefined) {
        return { example, degradations: [] };
    }

    const body = requestBodyOf(sentWith.requestBody);
    const request = exampleOverrides(parent, {
        ...parent,
        ...requestLinesOf(sentWith.parameters),
        body: body.body,
        auth: sentWith.auth ?? parent.auth,
        description: sentWith.description ?? parent.description,
    });

    return {
        example: request === undefined ? example : { ...example, request },
        degradations: body.degradations,
    };
}

/**
 * The examples of a request. Of the request each was saved with, Mandor keeps what it changes of
 * `parent`: the rest is the parent's, so an example saved with the same request keeps nothing.
 */
export function examplesOf(
    responses: readonly InteropResponseExample[],
    parent: RequestItem,
): { examples: RequestExample[]; degradations: Degradation[] } {
    const mapped = responses.map((response) => exampleOf(response, parent));

    return {
        examples: mapped.map(({ example }) => example),
        degradations: mapped.flatMap(({ degradations }) => degradations),
    };
}
