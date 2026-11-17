import { historyEntrySchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** One send in full, by the id the window gave it when it sent. */
export const historyReadRequestSchema = z
    .object({
        workspaceId: slugSchema,
        id: z.uuid(),
    })
    .strict();

export const historyReadResultSchema = resultSchema(historyEntrySchema);

export type HistoryReadRequest = z.infer<typeof historyReadRequestSchema>;
