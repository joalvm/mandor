import { historySummarySchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Pushed to the window after main wrote a send to disk, so a history that is open beside the
 * request updates without asking. The row is the one the list would give: already redacted.
 */
export const historyAppendedPushSchema = z
    .object({
        workspaceId: slugSchema,
        summary: historySummarySchema,
        /** The sends the limits of the history took out to make room: the list lets them go. */
        removed: z.array(z.uuid()),
    })
    .strict();

export type HistoryAppendedPush = z.infer<typeof historyAppendedPushSchema>;
