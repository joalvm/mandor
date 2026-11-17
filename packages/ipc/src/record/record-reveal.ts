import { z } from 'zod';

/** Asks the operating system to show one file the app wrote, where it lives. */
export const recordRevealRequestSchema = z.object({
    path: z.string().min(1),
});

export type RecordRevealRequest = z.infer<typeof recordRevealRequestSchema>;
