import { outlineNodeSchema } from '@mandor/interop-core';
import { entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
import { exportScopeShape, namesItsCollection, SCOPE_DISAGREES } from './export-scope.js';

/**
 * What one workspace would export, as the tree the dialog shows. It is read in main — the gatherer
 * lives there — and the renderer asks by the workspace it is looking at, the format it wants
 * and what it covers — the workspace, or one collection by its route — and never names a path.
 * The format is the id the app registered it under.
 */
export const exportOutlineRequestSchema = z
    .object({ workspaceId: slugSchema, format: slugSchema, ...exportScopeShape })
    .strict()
    .refine(namesItsCollection, SCOPE_DISAGREES);

export type ExportOutlineRequest = z.infer<typeof exportOutlineRequestSchema>;

const exportOutlineSchema = z
    .object({
        /** What the workspace is called, as the document will want to name it. */
        name: entityNameSchema,
        /** The nodes with a reason are the ones the format does not write. */
        nodes: z.array(outlineNodeSchema),
    })
    .strict();

export const exportOutlineResultSchema = resultSchema(exportOutlineSchema);

export type ExportOutline = z.infer<typeof exportOutlineSchema>;
