import { entityNameSchema, slugSchema, workspaceSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** The workspace is asked by id; the directory it lives in keeps the id and only the name moves. */
export const workspaceRenameRequestSchema = z
    .object({ id: slugSchema, name: entityNameSchema })
    .strict();

export const workspaceRenameResultSchema = resultSchema(workspaceSchema);

export type WorkspaceRenameRequest = z.infer<typeof workspaceRenameRequestSchema>;
