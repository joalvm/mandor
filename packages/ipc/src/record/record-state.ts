import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * The state of one recording, pushed to the window as it moves: the bar of the connection
 * reads it instead of counting on its own, because what the file holds is what main wrote —
 * the buffer of the timeline caps itself and is not the record.
 */
export const recordStatePushSchema = z
    .object({
        active: z.boolean(),
        connectionId: slugSchema,
        entries: z.number().int().nonnegative(),
    })
    .strict();

export type RecordStatePush = z.infer<typeof recordStatePushSchema>;
