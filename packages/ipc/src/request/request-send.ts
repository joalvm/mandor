import {
    collectionPathSchema,
    httpResponseSchema,
    requestItemSchema,
    slugSchema,
} from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * Sends the request the window shows. It travels as written on screen, `{{var}}` included, and
 * main resolves it against the environment: reading it from disk would lose the last
 * milliseconds of an edit still waiting to be written, and taking it resolved from the renderer
 * would let the part of Mandor a stranger can reach choose the url that gets dialed.
 * `itemPath` is where the request lives in its collection: the history files the send under it,
 * and the auth inherits from the folders above it. A request saved nowhere yet has none: it is
 * filed under no request and inherits only from the workspace.
 */
export const requestSendRequestSchema = z
    .object({
        sendId: z.uuid(),
        workspaceId: slugSchema,
        itemPath: collectionPathSchema.nullable(),
        environmentId: slugSchema.nullable(),
        request: requestItemSchema,
        /** Sends without running its scripts; what scripts set before still resolves. */
        skipScripts: z.boolean().optional(),
    })
    .strict();

export const requestSendResultSchema = resultSchema(httpResponseSchema);

export type RequestSendRequest = z.infer<typeof requestSendRequestSchema>;
