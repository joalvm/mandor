import { collectionNodeSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** The whole tree of one workspace: structure, names and order, and not one item body. */
export const collectionTreeRequestSchema = z.object({
    workspaceId: slugSchema,
});

export type CollectionTreeRequest = z.infer<typeof collectionTreeRequestSchema>;

export const collectionTreeResultSchema = resultSchema(z.array(collectionNodeSchema));
