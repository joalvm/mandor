import { type ChangedEntity, changedEntitySchema } from '@mandor/schema';
import { z } from 'zod';

/** Main pushes this when files of the open origin changed without the window asking for it. */
export type RepoChangedPush = {
    changes: ChangedEntity[];
};

export const repoChangedPushSchema = z
    .object({ changes: z.array(changedEntitySchema) })
    .strict() satisfies z.ZodType<RepoChangedPush>;

/**
 * Main pushes this when a clash was kept for a person to answer: the entity it belongs to and the
 * name the file carries, which is `''` when it carries none and the window says so in its words.
 */
export type ConflictRecordedPush = {
    entity: ChangedEntity;
    name: string;
};

export const conflictRecordedPushSchema = z
    .object({ entity: changedEntitySchema, name: z.string() })
    .strict() satisfies z.ZodType<ConflictRecordedPush>;
