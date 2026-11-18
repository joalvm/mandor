import { changedEntitySchema, type ChangedEntity } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** One side of a question: a value that crossed as JSON, or nothing when it is not there. */
export type ConflictSide = { value: unknown } | null;

/** A question the merge could not answer by itself, as `@mandor/merge` words it. */
export type ConflictItem = {
    /** The path of the question joined with `/`; empty for the whole file. */
    id: string;
    path: string[];
    shape: 'value' | 'row' | 'text' | 'file';
    base: ConflictSide;
    ours: ConflictSide;
    theirs: ConflictSide;
    /** Only for a text: the merge by lines, with this side in the chunks that clash. */
    proposed?: string | undefined;
};

const sideSchema = z.object({ value: z.json() }).strict().nullable();

export const conflictItemSchema = z
    .object({
        id: z.string(),
        path: z.array(z.string()),
        shape: z.enum(['value', 'row', 'text', 'file']),
        base: sideSchema,
        ours: sideSchema,
        theirs: sideSchema,
        proposed: z.string().optional(),
    })
    .strict() satisfies z.ZodType<ConflictItem>;

/** A clash opened: the questions left to answer, worked out from the file as it is now. */
export type ConflictDetail = {
    id: string;
    entity: ChangedEntity;
    name: string;
    conflicts: ConflictItem[];
};

const conflictDetailSchema = z
    .object({
        id: z.string().min(1),
        entity: changedEntitySchema,
        name: z.string(),
        conflicts: z.array(conflictItemSchema),
    })
    .strict() satisfies z.ZodType<ConflictDetail>;

/** A clash is opened by the id its row carries. */
export const conflictReadRequestSchema = z.object({ id: z.string().min(1) }).strict();

export type ConflictReadRequest = z.infer<typeof conflictReadRequestSchema>;

export const conflictReadResultSchema = resultSchema(conflictDetailSchema);
