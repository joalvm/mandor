import { environmentSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

export const environmentListRequestSchema = z.object({ workspaceId: slugSchema });
export const environmentListResultSchema = resultSchema(z.array(environmentSchema));

export type EnvironmentListRequest = z.infer<typeof environmentListRequestSchema>;
