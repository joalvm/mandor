import { z } from 'zod';

/**
 * How much of the past the history keeps, as the person chose it in the settings: how many sends
 * per workspace and for how many days. The settings live in the window and main prunes after each
 * send on its own, so the window hands the choice over when it is up and at each change.
 */
export const historyConfigureRequestSchema = z
    .object({
        maxEntries: z.number().int().positive(),
        maxAgeDays: z.number().int().positive(),
    })
    .strict();

export type HistoryConfigureRequest = z.infer<typeof historyConfigureRequestSchema>;
