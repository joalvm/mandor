import { z } from 'zod';

import type { BrunoExample, BrunoExampleRequest } from './bruno-tree.js';
import { descriptionSchema, httpSchema } from './opencollection-schema.js';
import { httpBodyOf } from './read-oc-body.js';
import { descriptionTextOf, paramsOf, rowsOf } from './read-oc-parts.js';

const exampleSchema = z.object({
    name: z.string().nullish(),
    description: descriptionSchema,
    request: httpSchema.pick({ url: true, headers: true, params: true, body: true }).nullish(),
    response: z
        .object({
            status: z.number().nullish(),
            headers: httpSchema.shape.headers,
            body: z.object({ type: z.string().nullish(), data: z.string().nullish() }).nullish(),
        })
        .nullish(),
});

type Example = z.output<typeof exampleSchema>;

function requestOf(request: Example['request']): BrunoExampleRequest | undefined {
    if (request === null || request === undefined) {
        return undefined;
    }

    return {
        url: request.url ?? '',
        headers: rowsOf(request.headers),
        params: paramsOf(request.params, 'query'),
        pathParams: paramsOf(request.params, 'path'),
        body: httpBodyOf(request.body),
    };
}

function answerOf(
    response: Example['response'],
): Pick<BrunoExample, 'status' | 'headers' | 'bodyType' | 'body'> {
    const body = response?.body;

    return {
        status: String(response?.status ?? ''),
        headers: rowsOf(response?.headers),
        bodyType: body?.type ?? '',
        body: body?.data ?? '',
    };
}

function exampleOf(example: Example): BrunoExample {
    return {
        name: example.name ?? '',
        description: descriptionTextOf(example.description),
        ...answerOf(example.response),
        request: requestOf(example.request),
    };
}

/** What can be read of the examples of a request, and whether any could not. */
export type ReadExamples = { examples: BrunoExample[]; unread: boolean };

/** The examples of an item of OpenCollection. One that does not read is said, not guessed. */
export function examplesOfOpenCollection(value: unknown): ReadExamples {
    if (value === undefined || value === null) {
        return { examples: [], unread: false };
    }

    const read = (Array.isArray(value) ? value : [value]).map((each) =>
        exampleSchema.safeParse(each),
    );

    return {
        examples: read.flatMap((each) => (each.success ? [exampleOf(each.data)] : [])),
        unread: read.some((each) => !each.success),
    };
}
