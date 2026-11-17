import { entityNameSchema, workspaceSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

// The kind is not a request field: main stamps it from the app it hosts. The origin is not
// one either: main writes to the active one.
export const workspaceCreateRequestSchema = z.object({
    name: entityNameSchema,
});

export type WorkspaceCreateRequest = z.infer<typeof workspaceCreateRequestSchema>;

/** The workspace as main wrote it, with the id and the kind it stamped. */
export const workspaceCreateResultSchema = resultSchema(workspaceSchema);
