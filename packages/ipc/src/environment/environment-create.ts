import { entityNameSchema, environmentSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

export const environmentCreateRequestSchema = z.object({
    workspaceId: slugSchema,
    name: entityNameSchema,
});
export const environmentCreateResultSchema = resultSchema(environmentSchema);

export type EnvironmentCreateRequest = z.infer<typeof environmentCreateRequestSchema>;
