import {
    collectionParentSchema,
    collectionPathSchema,
    entityNameSchema,
    slugSchema,
} from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * What is being made and where. One request covers folders and items because the two differ in
 * one thing only: a leaf says what kind it is, and a folder has nothing to say about kinds.
 */
export const collectionCreateRequestSchema = z.object({
    workspaceId: slugSchema,
    parent: collectionParentSchema,
    name: entityNameSchema,
    /** The kind of the leaf. Absent makes a folder; present hands the body to whoever owns it. */
    itemKind: slugSchema.optional(),
});

export type CollectionCreateRequest = z.infer<typeof collectionCreateRequestSchema>;

/** The path the new node took, so the tree can point at what it made. */
export const collectionCreateResultSchema = resultSchema(collectionPathSchema);
