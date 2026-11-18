import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

export const activeEnvironmentsSchema = z.record(slugSchema, slugSchema);
export const environmentActiveLoadRequestSchema = z.object({}).strict();
export const environmentActiveLoadResultSchema = resultSchema(activeEnvironmentsSchema);

export type ActiveEnvironments = z.infer<typeof activeEnvironmentsSchema>;
