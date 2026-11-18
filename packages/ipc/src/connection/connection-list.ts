import { connectionSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

export const connectionListRequestSchema = z.object({
    workspaceId: slugSchema,
});

export type ConnectionListRequest = z.infer<typeof connectionListRequestSchema>;

export const connectionListResultSchema = resultSchema(z.array(connectionSchema));
