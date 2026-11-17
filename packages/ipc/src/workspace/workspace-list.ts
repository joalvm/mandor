import { workspaceSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

// Main lists the workspaces of the active origin and filters by the kind of its app, so the
// request carries nothing at all.
export const workspaceListRequestSchema = z.object({}).strict();

/** A workspace as the management table reads it: the record, plus when it was last touched. */
export const listedWorkspaceSchema = workspaceSchema.extend({
    modifiedAt: z.string().nullable(),
});

export type ListedWorkspace = z.infer<typeof listedWorkspaceSchema>;

export const workspaceListResultSchema = resultSchema(z.array(listedWorkspaceSchema));
