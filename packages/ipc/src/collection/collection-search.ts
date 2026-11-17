import { resourceUriSchema, slugSchema, type ResourceUri } from '@mandor/schema';
import { z } from 'zod';

import { errorCodeSchema } from '../result/error-code.js';

export const collectionSearchRequestSchema = z.object({
    workspaceId: slugSchema,
    query: z.string().min(2).max(200),
});

export type CollectionSearchRequest = z.infer<typeof collectionSearchRequestSchema>;

export type CollectionSearchHit = {
    line: number;
    resource: ResourceUri;
    source: 'doc' | 'folder' | 'item';
};

const collectionSearchHitSchema: z.ZodType<CollectionSearchHit> = z.object({
    line: z.number().int().positive(),
    resource: resourceUriSchema,
    source: z.enum(['doc', 'folder', 'item']),
});

export const collectionSearchResultSchema = z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value: z.array(collectionSearchHitSchema) }),
    z.object({
        ok: z.literal(false),
        error: z.object({ code: errorCodeSchema, message: z.string() }),
    }),
]);
