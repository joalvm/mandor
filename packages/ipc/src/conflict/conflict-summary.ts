import { changedEntitySchema, type ChangedEntity } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * One clash waiting for a person, as a row of a list: which entity it belongs to, the name the
 * person knows it by, the sections of it that clash, and where the clash came from. The
 * texts are not here; opening the clash reads them.
 */
export type ConflictSummary = {
    /** Names the clash: the same file gives the same id, so a tab can find its clash again. */
    id: string;
    entity: ChangedEntity;
    name: string;
    /** The parts of the entity that clash (`headers`, `body`); empty when the whole file does. */
    sections: string[];
    source: 'write' | 'merge';
    at: string;
};

export const conflictSummarySchema = z
    .object({
        id: z.string().min(1),
        entity: changedEntitySchema,
        name: z.string(),
        sections: z.array(z.string()),
        source: z.enum(['write', 'merge']),
        at: z.iso.datetime(),
    })
    .strict() satisfies z.ZodType<ConflictSummary>;

export const conflictListResultSchema = resultSchema(z.array(conflictSummarySchema));
