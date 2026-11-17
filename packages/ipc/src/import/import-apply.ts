import { importPlanSchema } from '@mandor/interop-core';
import { entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
/**
 * Where an import writes: into a workspace that exists, or into a new one that main makes
 * after the document, in the same act that writes the plan. Never both: a request that names
 * the two is refused, not guessed at.
 */
const importTargetSchema = z.union([
    z.strictObject({ workspaceId: slugSchema }),
    z.strictObject({ newWorkspace: entityNameSchema }),
]);

export type ImportTarget = z.infer<typeof importTargetSchema>;

// The plan comes back exactly as the build answered it: the user accepted that difference,
// and an apply that renegotiated the terms would be writing something nobody saw. The name is
// what the commit of the import is called after.
export const importApplyRequestSchema = z.object({
    target: importTargetSchema,
    name: entityNameSchema,
    plan: importPlanSchema,
});

export type ImportApplyRequest = z.input<typeof importApplyRequestSchema>;

export const importAppliedSchema = z.object({
    /** How many resources of the plan were written. A conflict or an unmarked row is not one. */
    applied: z.number().int().nonnegative(),
    /** The workspace that received the import: the one asked for, or the one just made. */
    workspaceId: slugSchema,
});

export type ImportApplied = z.infer<typeof importAppliedSchema>;

export const importApplyResultSchema = resultSchema(importAppliedSchema);
