import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

export const recordPickRequestSchema = z.object({
    /** What the dialog of the system offers as a name. The user decides the rest of the path. */
    suggestedName: z.string().min(1),
});

/** `null` is the user closing the dialog: no recording starts, and nothing went wrong. */
export const recordPickResultSchema = resultSchema(
    z.object({ path: z.string().nullable() }).strict(),
);

export type RecordPickRequest = z.infer<typeof recordPickRequestSchema>;
