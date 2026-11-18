import { z } from 'zod';

import { SEGMENT } from '../id/segment-pattern.js';
import { httpResponseSchema } from '../response/http-response.js';
import { responseBodySchema } from '../response/response-body.js';

/**
 * `ErrorCode` lives in `ipc` and this package imports nothing: the shape of the code is the
 * contract, and the handler that writes the entry fills it from a real `ErrorCode`.
 */
const FAILURE_CODE = /^request-[a-z-]+$/;

const requestSchema = z
    .object({
        method: z.string(),
        url: z.string(),
        headers: z.array(z.tuple([z.string(), z.string()])),
        body: responseBodySchema.nullable(),
    })
    .strict();

const outcomeSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('response'), response: httpResponseSchema }).strict(),
    z
        .object({
            kind: z.literal('failure'),
            code: z.string().regex(FAILURE_CODE),
            message: z.string(),
        })
        .strict(),
]);

/**
 * One send at rest: the request as it left, resolved and redacted, and what came back or why
 * nothing did. Every object is strict because the file is read back by a later version: a key
 * this one does not know is a file it must not rewrite.
 */
export const historyEntrySchema = z
    .object({
        id: z.uuid(),
        workspaceId: z.string().regex(SEGMENT),
        itemPath: z.string().nullable(),
        environmentId: z.string().nullable(),
        sentAt: z.iso.datetime(),
        request: requestSchema,
        outcome: outcomeSchema,
    })
    .strict();
