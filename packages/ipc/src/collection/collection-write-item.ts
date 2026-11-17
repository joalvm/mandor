import { collectionItemEnvelopeSchema, collectionPathSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * What one item says about itself, whole. The fields are the flat record the file has, so a
 * kind this window never heard of travels back out with its keys untouched.
 */
export const collectionWriteItemRequestSchema = z.object({
    workspaceId: slugSchema,
    path: collectionPathSchema,
    fields: collectionItemEnvelopeSchema,
});

export type CollectionWriteItemRequest = z.infer<typeof collectionWriteItemRequestSchema>;
