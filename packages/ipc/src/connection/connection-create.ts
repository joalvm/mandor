import {
    connectionFieldsSchema,
    connectionSchema,
    connectionTransportSchema,
    connectionUrlSchema,
    entityNameSchema,
    slugSchema,
} from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

// No environment field: a new connection starts with none, so main stores null. No origin
// either: main writes to the active one. The transport is absent for the default one, and
// the url is checked against the transport where the file is written, not here.
export const connectionCreateRequestSchema = z.object({
    workspaceId: slugSchema,
    name: entityNameSchema,
    transport: connectionTransportSchema.optional(),
    url: connectionUrlSchema,
    headers: connectionFieldsSchema.shape.headers.optional(),
});

export type ConnectionCreateRequest = z.infer<typeof connectionCreateRequestSchema>;

/** The connection as main wrote it, with the id it took. */
export const connectionCreateResultSchema = resultSchema(connectionSchema);
