import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The environment a workspace takes when nobody chose one, which travels in its file. Reading
 * it names the workspace; null in the answer means it has none.
 */
export const environmentDefaultLoadRequestSchema = z.object({ workspaceId: slugSchema }).strict();

export const environmentDefaultResultSchema = resultSchema(
    z.object({ environmentId: slugSchema.nullable() }).strict(),
);

/** Sets the default of a workspace, or takes it away with null. */
export const environmentDefaultSaveRequestSchema = z
    .object({ workspaceId: slugSchema, environmentId: slugSchema.nullable() })
    .strict();

export const environmentDefaultSaveResultSchema = resultSchema(z.object({}).strict());

export type EnvironmentDefaultLoadRequest = z.infer<typeof environmentDefaultLoadRequestSchema>;
export type EnvironmentDefaultSaveRequest = z.infer<typeof environmentDefaultSaveRequestSchema>;
