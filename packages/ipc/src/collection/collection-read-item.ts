import { collectionItemEnvelopeSchema, collectionPathSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * Which item to open. The tree carries no bodies on purpose, so this is the one call of the
 * area that reads a file, and it reads exactly one.
 */
export const collectionReadItemRequestSchema = z.object({
    workspaceId: slugSchema,
    path: collectionPathSchema,
});

export type CollectionReadItemRequest = z.infer<typeof collectionReadItemRequestSchema>;

/** The item as it travels flat: envelope keys and the keys of its kind at the same level. */
export const collectionReadItemResultSchema = resultSchema(collectionItemEnvelopeSchema);
