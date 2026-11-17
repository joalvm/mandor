import { z } from 'zod';

import { bruBodySchema, bruRowsSchema } from './bru-schema.js';
import type { BrunoExample, BrunoExampleRequest } from './bruno-tree.js';
import { bodyOfBru } from './read-bru-body.js';
import { paramsOfBru, rowsOfBru } from './read-bru-rows.js';
import type { ReadExamples } from './read-oc-example.js';

const exampleSchema = z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
    request: z
        .object({
            url: z.string().nullish(),
            headers: bruRowsSchema,
            params: bruRowsSchema,
            body: bruBodySchema.extend({ mode: z.string().nullish() }).nullish(),
        })
        .nullish(),
    response: z
        .object({
            status: z.union([z.string(), z.number()]).nullish(),
            headers: bruRowsSchema,
            body: z.object({ type: z.string().nullish(), content: z.string().nullish() }).nullish(),
        })
        .nullish(),
});

// The two dialects of Bruno read alike in form and share no type or reader.
// jscpd:ignore-start
type Example = z.output<typeof exampleSchema>;

function requestOf(request: Example['request']): BrunoExampleRequest | undefined {
    if (request === null || request === undefined) {
        return undefined;
    }

    return {
        url: request.url ?? '',
        headers: rowsOfBru(request.headers),
        params: paramsOfBru(request.params, 'query'),
        pathParams: paramsOfBru(request.params, 'path'),
        body: bodyOfBru(request.body?.mode, request.body),
    };
}
// jscpd:ignore-end

function answerOf(
    response: Example['response'],
): Pick<BrunoExample, 'status' | 'headers' | 'bodyType' | 'body'> {
    const body = response?.body;

    return {
        status: String(response?.status ?? ''),
        headers: rowsOfBru(response?.headers),
        bodyType: body?.type ?? '',
        body: body?.content ?? '',
    };
}

function exampleOf(example: Example): BrunoExample {
    return {
        name: example.name ?? '',
        description: example.description ?? '',
        ...answerOf(example.response),
        request: requestOf(example.request),
    };
}

/** The examples of a `.bru` file. One that does not read is said, not guessed. */
export function examplesOfBru(value: unknown): ReadExamples {
    const read = (Array.isArray(value) ? value : []).map((each) => exampleSchema.safeParse(each));

    return {
        examples: read.flatMap((each) => (each.success ? [exampleOf(each.data)] : [])),
        unread: read.some((each) => !each.success),
    };
}
