import { collectionPathSchema, entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * The new visible name of a folder or of an item. The renderer sends what a person typed and
 * main writes it in the file: the path is an id that never changes, so there is nothing to
 * answer. Which of the two shapes it is travels in the channel, not in the request: the row
 * already knows, and main has no business guessing it back off disk.
 */
export const collectionRenameRequestSchema = z.object({
    workspaceId: slugSchema,
    path: collectionPathSchema,
    name: entityNameSchema,
});

export type CollectionRenameRequest = z.infer<typeof collectionRenameRequestSchema>;
