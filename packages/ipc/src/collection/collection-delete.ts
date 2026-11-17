import { collectionPathSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * What stops existing. A folder takes everything under it along, and there is no bin: what
 * brings work back is the history of the origin.
 */
export const collectionDeleteRequestSchema = z.object({
    workspaceId: slugSchema,
    path: collectionPathSchema,
});

export type CollectionDeleteRequest = z.infer<typeof collectionDeleteRequestSchema>;
