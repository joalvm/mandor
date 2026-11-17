import { collectionPathSchema, historySummarySchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The rows of the history of one workspace, newest first, or only those of one request when
 * `itemPath` is there. Rows carry no body: the list never reads one, so listing 500 sends costs
 * the same whatever the sends returned.
 */
export const historyListRequestSchema = z
    .object({
        workspaceId: slugSchema,
        itemPath: collectionPathSchema.optional(),
    })
    .strict();

export const historyListResultSchema = resultSchema(
    z.object({ entries: z.array(historySummarySchema) }).strict(),
);

export type HistoryListRequest = z.infer<typeof historyListRequestSchema>;
