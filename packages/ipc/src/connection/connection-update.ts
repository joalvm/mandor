import {
    authConfigSchema,
    connectionFieldsSchema,
    connectionScriptsSchema,
    connectionSchema,
    connectionTransportSchema,
    connectionUrlSchema,
    entityNameSchema,
    keepaliveOptionsSchema,
    retryOptionsSchema,
    slugSchema,
    socketIoOptionsSchema,
    websocketOptionsSchema,
} from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

// The id is the file name: it moves or stays, it is never an edit. A change of url and a
// change of transport are checked as a pair where the file lives, which is the only place
// that knows the value the other one had.
const connectionChangesSchema = z.object({
    name: entityNameSchema.optional(),
    transport: connectionTransportSchema.optional(),
    url: connectionUrlSchema.optional(),
    headers: connectionFieldsSchema.shape.headers.optional(),
    params: connectionFieldsSchema.shape.params,
    description: z.string().optional(),
    auth: authConfigSchema.optional(),
    environmentId: slugSchema.nullable().optional(),
    websocket: websocketOptionsSchema.optional(),
    socketio: socketIoOptionsSchema.optional(),
    retry: retryOptionsSchema.optional(),
    keepalive: keepaliveOptionsSchema.optional(),
    // `null` is a connection left with no script at all: an absent field is no change.
    scripts: connectionScriptsSchema.nullable().optional(),
});

export const connectionUpdateRequestSchema = z.object({
    workspaceId: slugSchema,
    connectionId: slugSchema,
    changes: connectionChangesSchema,
});

export type ConnectionChanges = z.infer<typeof connectionChangesSchema>;
export type ConnectionUpdateRequest = z.infer<typeof connectionUpdateRequestSchema>;

/** The connection after the change, as the file holds it now. */
export const connectionUpdateResultSchema = resultSchema(connectionSchema);
