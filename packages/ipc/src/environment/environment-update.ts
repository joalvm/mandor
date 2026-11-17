import { entityNameSchema, environmentSchema, slugSchema, variableSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

const environmentChangesSchema = z.object({
    name: entityNameSchema.optional(),
    variables: z.array(variableSchema).optional(),
});

export const environmentUpdateRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema,
    changes: environmentChangesSchema,
});
export const environmentUpdateResultSchema = resultSchema(environmentSchema);

export type EnvironmentChanges = z.infer<typeof environmentChangesSchema>;
export type EnvironmentUpdateRequest = z.infer<typeof environmentUpdateRequestSchema>;
