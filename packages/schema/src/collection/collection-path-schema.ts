import { z } from 'zod';

import { SEGMENT } from '../id/segment-pattern.js';

/**
 * The path of a folder or an item inside the collection: id segments joined by `/`. Validating
 * every segment is the path-traversal gate, and it runs before the path reaches any `join`.
 */
export const collectionPathSchema = z
    .string()
    .refine((value) => value.split('/').every((segment) => SEGMENT.test(segment)), {
        message: 'A collection path is made of id segments joined by "/"',
    });

/**
 * The folder something hangs from. Empty is the top level, which has no path of its own and
 * keeps its order in the root file, so it cannot be spelled with segments.
 */
export const collectionParentSchema = z.union([z.literal(''), collectionPathSchema]);
