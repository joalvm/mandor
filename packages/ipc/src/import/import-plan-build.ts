import { importPlanSchema, INTEROP_SCOPES } from '@mandor/interop-core';
import { entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
import { importFileSchema } from './import-file.js';

// The files travel whole and are parsed in main: the parser never enters the renderer bundle,
// and a document too big to read is exactly the one the window must survive. The format is
// found by main, which asks every format the app listed whether the files are one of its own.
// The scope says what the import may touch: a collection brings the collection and what it holds,
// and the workspace brings the environments, the connections and the notes too. A workspace
// import into one that does not exist yet names none: there is nothing there to compare with,
// and every resource of the document enters as an addition.
export const importPlanBuildRequestSchema = z.object({
    workspaceId: slugSchema.optional(),
    files: z.array(importFileSchema).min(1),
    scope: z.enum(INTEROP_SCOPES),
});

export type ImportPlanBuildRequest = z.infer<typeof importPlanBuildRequestSchema>;

export const importPlanBuiltSchema = z.object({
    name: entityNameSchema,
    plan: importPlanSchema,
});

export type ImportPlanBuilt = z.infer<typeof importPlanBuiltSchema>;

export const importPlanBuildResultSchema = resultSchema(importPlanBuiltSchema);
