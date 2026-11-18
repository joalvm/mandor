import { z } from 'zod';

import type { CollectionNode } from './collection-node.js';

/**
 * The tree as main hands it back, checked node by node. Lazy because a node holds nodes; the
 * union is built once, at the first parse.
 */
export const collectionNodeSchema: z.ZodType<CollectionNode> = z.lazy(() =>
    z.discriminatedUnion('kind', [
        z
            .object({
                kind: z.literal('collection'),
                path: z.string(),
                name: z.string(),
                description: z.string().optional(),
                children: z.array(collectionNodeSchema),
            })
            .strict(),
        z
            .object({
                kind: z.literal('folder'),
                path: z.string(),
                name: z.string(),
                children: z.array(collectionNodeSchema),
            })
            .strict(),
        z
            .object({
                kind: z.literal('item'),
                path: z.string(),
                name: z.string(),
                itemKind: z.string(),
                mark: z.string().optional(),
                examples: z
                    .array(
                        z
                            .object({
                                key: z.string(),
                                name: z.string(),
                                mark: z.string().optional(),
                            })
                            .strict(),
                    )
                    .optional(),
                tags: z.array(z.string()),
            })
            .strict(),
    ]),
);
