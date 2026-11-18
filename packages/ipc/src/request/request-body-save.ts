import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

const suggestedName = z.string().min(1);

/**
 * Saves a body where the user picks: the one that went to disk by its reference, or the one the
 * window still holds as text or base64. Main opens the save dialog, so the path is the user's
 * and never the renderer's.
 */
export const requestBodySaveRequestSchema = z.union([
    z.object({ ref: z.string().regex(/^[a-f0-9]{64}$/), suggestedName }).strict(),
    z.object({ encoding: z.literal('utf8'), text: z.string(), suggestedName }).strict(),
    z.object({ encoding: z.literal('base64'), data: z.string(), suggestedName }).strict(),
]);

/** `null` is the user closing the dialog: nothing was written and nothing went wrong. */
export const requestBodySaveResultSchema = resultSchema(
    z.object({ path: z.string().nullable() }).strict(),
);

export type RequestBodySaveRequest = z.infer<typeof requestBodySaveRequestSchema>;
