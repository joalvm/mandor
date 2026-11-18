import { collectionParentSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Where a node lands among its siblings. It names the folder that holds them because that is
 * the only file a reorder writes: the order of a folder lives in the folder, never in a node.
 */
export const collectionReorderRequestSchema = z.object({
    workspaceId: slugSchema,
    parent: collectionParentSchema,
    name: slugSchema,
    /** The sibling the node lands above. `null` sends it to the end of the order. */
    before: slugSchema.nullable(),
});

export type CollectionReorderRequest = z.infer<typeof collectionReorderRequestSchema>;
