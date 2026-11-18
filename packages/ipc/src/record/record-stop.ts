import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** The answer of a stopped recording: where the file stayed, and how much of the session it holds. */
export const recordStoppedSchema = z
    .object({
        entries: z.number().int().nonnegative(),
        path: z.string().min(1),
    })
    .strict();

export const recordStopRequestSchema = z.object({ connectionId: slugSchema });

export const recordStopResultSchema = resultSchema(recordStoppedSchema);

export type RecordStopped = z.infer<typeof recordStoppedSchema>;
export type RecordStopRequest = z.infer<typeof recordStopRequestSchema>;
