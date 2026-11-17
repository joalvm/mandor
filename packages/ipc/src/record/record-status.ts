import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** Whether one connection is being written right now, and how much of the session it holds. */
export const recordStatusSchema = z
    .object({
        active: z.boolean(),
        entries: z.number().int().nonnegative(),
    })
    .strict();

export const recordStatusRequestSchema = z.object({ connectionId: slugSchema });

export const recordStatusResultSchema = resultSchema(recordStatusSchema);

export type RecordStatus = z.infer<typeof recordStatusSchema>;
export type RecordStatusRequest = z.infer<typeof recordStatusRequestSchema>;
