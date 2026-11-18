import { degradationSchema } from '../resource/degradation.js';
import { z } from 'zod';

import { itemOriginSchema } from '@mandor/schema';

import { importResourceSchema } from '../resource/import-resource-schema.js';
import { RESOURCE_PLACES } from '../resource/resource-place.js';
import { IMPORT_PLAN_ENTRY_CLASSES, type ImportPlan, type ImportPlanEntry } from './import-plan.js';

const importPlanEntrySchema = z
    .object({
        class: z.enum(IMPORT_PLAN_ENTRY_CLASSES),
        place: z.enum(RESOURCE_PLACES),
        route: z.string().regex(/\S/),
        name: z.string().regex(/\S/),
        resource: importResourceSchema.nullable(),
        selected: z.boolean(),
        leftOut: degradationSchema.optional(),
    })
    .strict() satisfies z.ZodType<ImportPlanEntry>;

const importPlanBody = z
    .object({
        identity: itemOriginSchema.nullable(),
        entries: z.array(importPlanEntrySchema),
    })
    .strict() satisfies z.ZodType<ImportPlan>;

/** Reads a plan back whole: identity and entries agree, because one cannot travel without the other. */
export const importPlanSchema = importPlanBody.refine(
    (plan) => (plan.identity === null) === (plan.entries.length === 0),
    'a plan that carries entries names who wrote them, and a plan that names none carries none',
);
