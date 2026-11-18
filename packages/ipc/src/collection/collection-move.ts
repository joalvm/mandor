import { collectionPathSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Where a node goes. Moving and renaming are one call because the path is the identity: both
 * say which path stops being the item's and which one starts.
 */
export const collectionMoveRequestSchema = z.object({
    workspaceId: slugSchema,
    from: collectionPathSchema,
    to: collectionPathSchema,
    /** What travels: a file for an item, a whole directory for a folder. The row knows which. */
    kind: z.enum(['collection', 'folder', 'item']),
    /** The sibling it lands above where it arrives. `null` sends it to the end of the order. */
    before: slugSchema.nullable().default(null),
});

export type CollectionMoveRequest = z.infer<typeof collectionMoveRequestSchema>;
