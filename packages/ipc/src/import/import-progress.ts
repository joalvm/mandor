import { z } from 'zod';

/** How many files pass between two pushes: one for each would flood the window on a big folder. */
export const IMPORT_PROGRESS_EVERY = 50;

/** Main pushes this while it reads what was picked: how many files it has read so far. */
export const importProgressPushSchema = z
    .object({ files: z.number().int().nonnegative() })
    .strict();

export type ImportProgressPush = z.infer<typeof importProgressPushSchema>;
