import { z } from 'zod';

/** Main pushes this when the clashes kept for a person changed: one was kept, or one went away. */
export type ConflictChangedPush = Record<string, never>;

export const conflictChangedPushSchema = z
    .object({})
    .strict() satisfies z.ZodType<ConflictChangedPush>;
