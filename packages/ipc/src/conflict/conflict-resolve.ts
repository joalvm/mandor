import { z } from 'zod';

/** What a person answered to one question of a clash: one of the two sides, or a text. */
export type ConflictChoice = { pick: 'ours' | 'theirs' } | { text: string };

export const conflictChoiceSchema = z.union([
    z.object({ pick: z.enum(['ours', 'theirs']) }).strict(),
    z.object({ text: z.string() }).strict(),
]) satisfies z.ZodType<ConflictChoice>;

/** A clash is resolved with an answer for each of its questions, keyed by the id of each. */
export const conflictResolveRequestSchema = z
    .object({
        id: z.string().min(1),
        choices: z.record(z.string(), conflictChoiceSchema),
    })
    .strict();

export type ConflictResolveRequest = z.infer<typeof conflictResolveRequestSchema>;

/** Keeping this copy as it is asks only for the clash. */
export const conflictKeepMineRequestSchema = z.object({ id: z.string().min(1) }).strict();

export type ConflictKeepMineRequest = z.infer<typeof conflictKeepMineRequestSchema>;
