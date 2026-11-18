import { collectionPathSchema, folderChainLevelSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The chain above one place, from the closest folder to the workspace. `parentPath` is the
 * folder the item hangs from — null at the top level — and the workspace itself closes the list.
 */
export const collectionChainRequestSchema = z.object({
    workspaceId: slugSchema,
    parentPath: collectionPathSchema.nullable(),
});

export type CollectionChainRequest = z.infer<typeof collectionChainRequestSchema>;

/** The levels of the chain, closest first, each with its settings; the workspace is the last. */
export const collectionChainResultSchema = resultSchema(z.array(folderChainLevelSchema));
